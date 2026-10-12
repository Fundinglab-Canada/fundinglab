import { describe, expect, it, vi } from "vitest";
import { dilution, dscr, grantCostShare, loanRepayment, runway } from "@/lib/funding-calculators";
import { generateRoadmap, stackMetrics, suggestedStack, type RoadmapInput } from "@/lib/roadmap";
import { alertDue, matchProgram, rankPrograms, type MatchBusiness, type MatchProgram } from "@/lib/programs/match";
import { dataRoomViewerLimit, hasFeature, planForPrice } from "@/lib/plans";
import { buildChecklist, checklistProgress } from "@/lib/applications";
import { businessPlanCompleteness, capTableSummary, dataRoomCompleteness } from "@/lib/prep";

vi.mock("server-only", () => ({}));

describe("funding calculators", () => {
  it("dilution with a post-money option pool", () => {
    const r = dilution({ preMoney: 4_000_000, investment: 1_000_000, founderPct: 100, newPoolPct: 10 });
    expect(r.postMoney).toBe(5_000_000);
    expect(r.investorPct).toBeCloseTo(20);
    expect(r.founderAfterPct).toBeCloseTo(70);
  });
  it("loan repayment matches the amortization formula and handles 0%", () => {
    const r = loanRepayment({ principal: 100_000, annualRatePct: 6, years: 5 });
    expect(r.monthly).toBeCloseTo(1933.28, 1);
    expect(loanRepayment({ principal: 60_000, annualRatePct: 0, years: 5 }).monthly).toBe(1000);
  });
  it("DSCR flags the 1.25× lender threshold", () => {
    expect(dscr({ annualNetOperatingIncome: 125_000, annualDebtService: 100_000 }).meetsTypical).toBe(true);
    expect(dscr({ annualNetOperatingIncome: 110_000, annualDebtService: 100_000 }).meetsTypical).toBe(false);
    expect(dscr({ annualNetOperatingIncome: 1, annualDebtService: 0 }).ratio).toBeNull();
  });
  it("grant cost share caps the grant and warns over the stacking limit", () => {
    const r = grantCostShare({ projectCost: 900_000, programPct: 60, maxGrant: 1_000_000, otherGovernment: 200_000, stackingLimitPct: 75 });
    expect(r.grant).toBe(540_000);
    expect(r.yourShare).toBe(160_000);
    expect(r.overStackingLimit).toBe(true);
    expect(grantCostShare({ projectCost: 1_000_000, programPct: 80, maxGrant: 400_000 }).capped).toBe(true);
  });
  it("runway in months, or profitable", () => {
    expect(runway({ cash: 120_000, monthlyExpenses: 30_000, monthlyRevenue: 10_000 }).months).toBe(6);
    expect(runway({ cash: 1, monthlyExpenses: 5, monthlyRevenue: 10 }).profitable).toBe(true);
  });
});

const base: RoadmapInput = { stage: "seed", funding_preference: "either", use_of_funds: [], amount_sought: 300_000, documents: [], hasAssessment: false, consent_matching: false };

describe("funding roadmap", () => {
  it("follows the stage defaults, prep first", () => {
    const steps = generateRoadmap(base);
    expect(steps[0].kind).toBe("prep");
    const now = steps.filter((s) => s.when === "now" && s.kind === "funding").map((s) => s.id);
    expect(now).toEqual(["grants", "angels"]);
  });
  it("non-dilutive preference drops equity steps", () => {
    const steps = generateRoadmap({ ...base, funding_preference: "non_dilutive" });
    expect(steps.some((s) => s.dilutive)).toBe(false);
    expect(steps.some((s) => s.id === "pitch_deck")).toBe(false);
  });
  it("need-driven steps lead and aren't duplicated", () => {
    const steps = generateRoadmap({ ...base, stage: "preseed", use_of_funds: ["hire_staff", "rd"] });
    const funding = steps.filter((s) => s.kind === "funding");
    expect(funding[0].id).toBe("wage_subsidies");
    expect(funding.filter((s) => s.id === "tax_credits")).toHaveLength(1);
  });
  it("exit stage points at M&A and PE", () => {
    const ids = generateRoadmap({ ...base, stage: "exit" }).filter((s) => s.when === "now" && s.kind === "funding").map((s) => s.id);
    expect(ids).toEqual(["ma", "pe"]);
  });
});

describe("capital stack", () => {
  it("blended cost, dilution and the stacking warning", () => {
    const m = stackMetrics([
      { id: "a", source: "grant", amount: 400_000 },
      { id: "b", source: "bank_loan", amount: 100_000 },
      { id: "c", source: "angel", amount: 0 },
    ], 500_000, null);
    expect(m.total).toBe(500_000);
    expect(m.blendedCost).toBeCloseTo(1.6);
    expect(m.governmentPct).toBe(80);
    expect(m.stackingWarning).toBe(true);
    const eq = stackMetrics([{ id: "a", source: "angel", amount: 500_000 }], 1_000_000, 2_000_000);
    expect(eq.dilutionPct).toBeCloseTo(20);
    expect(eq.gap).toBe(500_000);
    expect(stackMetrics([{ id: "a", source: "angel", amount: 1 }], 1, null).needsValuation).toBe(true);
  });
  it("suggests a starting stack from 'now' steps", () => {
    const s = suggestedStack(generateRoadmap({ ...base, documents: ["financials", "business_plan", "pitch_deck"], hasAssessment: true }), 300_000);
    expect(s.map((i) => i.source)).toEqual(["grant", "angel"]);
    expect(s[0].amount).toBe(150_000);
  });
});

const biz: MatchBusiness = {
  province: "BC", stage: "growth", industry: "advanced_manufacturing", amount_sought: 500_000, use_of_funds: ["hire_staff"],
  ownership_tags: [], legal_structure: "corporation", revenue_12m: 2_000_000, annual_revenue: null, revenue_band: null, employees: 20,
};
const prog = (o: Partial<MatchProgram>): MatchProgram => ({
  level: "federal", province: null, type: "grant", name: "Test", summary: null, industries: [], stages: [], min_amount: null, max_amount: null,
  intake_close: null, close_at: null, rolling: true, eligibility_rules: {}, ...o,
});

describe("program matcher", () => {
  it("explains why a program fits", () => {
    const m = matchProgram(prog({ province: "BC", stages: ["growth"], type: "wage_subsidy" }), biz);
    expect(m.blocked).toBe(false);
    expect(m.score).toBeGreaterThanOrEqual(70);
    expect(m.why.join(" ")).toMatch(/BC/);
    expect(m.why.join(" ")).toMatch(/hire staff/);
  });
  it("blocks wrong province, missing ownership tag, low revenue and wrong legal structure", () => {
    expect(matchProgram(prog({ province: "ON" }), biz).blocked).toBe(true);
    expect(matchProgram(prog({ eligibility_rules: { ownership_tags: ["women_owned"] } }), biz).blocked).toBe(true);
    expect(matchProgram(prog({ eligibility_rules: { min_revenue: 5_000_000 } }), biz).blocked).toBe(true);
    const r = matchProgram(prog({ eligibility_rules: { legal_structures: ["nonprofit"] } }), biz);
    expect(r.blocked).toBe(true);
    expect(r.score).toBeLessThanOrEqual(25);
  });
  it("uses the revenue band when exact revenue is missing", () => {
    const b = { ...biz, revenue_12m: null, revenue_band: "1m_5m" };
    expect(matchProgram(prog({ eligibility_rules: { min_revenue: 1_000_000 } }), b).blocked).toBe(false);
    expect(matchProgram(prog({ eligibility_rules: { min_revenue: 1_000_000 } }), { ...b, revenue_band: "500k_1m" }).blocked).toBe(true);
  });
  it("flags closed intakes and ranks eligible programs first", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    const closed = prog({ rolling: false, close_at: "2026-10-01T00:00:00Z" });
    expect(matchProgram(closed, biz, now).closed).toBe(true);
    const ranked = rankPrograms([prog({ province: "ON" }), prog({ stages: ["growth"] })], biz, now);
    expect(ranked[0].match.blocked).toBe(false);
  });
});

describe("deadline alerts", () => {
  const close = new Date("2026-11-20T23:59:00-08:00");
  it("sends only the tightest threshold reached, once", () => {
    expect(alertDue(close, [], new Date("2026-10-01T00:00:00Z"))).toBeNull();
    expect(alertDue(close, [], new Date("2026-10-25T00:00:00Z"))).toEqual({ threshold: 30, markSent: [30] });
    expect(alertDue(close, [], new Date("2026-11-10T00:00:00Z"))).toEqual({ threshold: 14, markSent: [30, 14] });
    expect(alertDue(close, [30, 14], new Date("2026-11-12T00:00:00Z"))).toBeNull();
    expect(alertDue(close, [30, 14], new Date("2026-11-19T00:00:00Z"))).toEqual({ threshold: 3, markSent: [3] });
    expect(alertDue(close, [], new Date("2026-11-22T00:00:00Z"))).toBeNull();
  });
});

describe("plans", () => {
  it("gates features by plan", () => {
    expect(hasFeature("free", "applications")).toBe(false);
    expect(hasFeature("starter", "applications")).toBe(true);
    expect(hasFeature("starter", "data_room")).toBe(false);
    expect(hasFeature("pro", "data_room")).toBe(true);
    expect(hasFeature("bogus", "calculators")).toBe(false);
    expect(dataRoomViewerLimit("growth")).toBe(10);
    expect(dataRoomViewerLimit("pro")).toBe(Infinity);
  });
  it("maps Stripe prices back to plans", () => {
    expect(planForPrice("price_g", { STRIPE_PRICE_GROWTH: "price_g" })).toBe("growth");
    expect(planForPrice("price_x", { STRIPE_PRICE_GROWTH: "price_g" })).toBeNull();
  });
});

describe("prep studio", () => {
  it("links required documents to data room files", () => {
    const items = buildChecklist(["Financial statements (2 years)", "Signed attestation form", "12-month cash-flow forecast"], [
      { id: "d1", kind: "financials", folder: "financial", file_name: "fs.pdf" },
    ]);
    expect(items.map((i) => i.done)).toEqual([true, false, true]);
    expect(items[0].document_id).toBe("d1");
    expect(checklistProgress(items).pct).toBe(67);
  });
  it("completeness for data room, business plan and cap table", () => {
    expect(dataRoomCompleteness(["corporate", "financial", "other"])).toBe(29);
    expect(businessPlanCompleteness({ summary: "x".repeat(150), market: "short" })).toBe(9);
    const cap = capTableSummary([
      { holder: "Founder", class: "Common", shares: 8_000_000, options: 0 },
      { holder: "Pool", class: "Option pool", shares: 0, options: 2_000_000 },
      { holder: " ", class: "Common", shares: 5, options: 0 },
    ]);
    expect(cap.fullyDiluted).toBe(10_000_000);
    expect(cap.rows[0].pct).toBe(80);
    expect(cap.rows).toHaveLength(2);
  });
});

describe("data room watermark", () => {
  it("stamps every page and rejects non-PDF input", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const { watermarkPdf } = await import("@/lib/watermark");
    const doc = await PDFDocument.create();
    doc.addPage([612, 792]);
    doc.addPage([792, 612]);
    const src = await doc.save();
    const out = await watermarkPdf(src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength) as ArrayBuffer, "investor@example.com", new Date("2026-10-12T00:00:00Z"));
    expect(out).not.toBeNull();
    const back = await PDFDocument.load(out!);
    expect(back.getPageCount()).toBe(2);
    expect(out!.byteLength).toBeGreaterThan(src.byteLength);
    expect(await watermarkPdf(new TextEncoder().encode("not a pdf").buffer as ArrayBuffer, "x@example.com")).toBeNull();
  });
});
