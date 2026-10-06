import { describe, expect, it } from "vitest";
import { redipShare, rtriLiquidity, rtriPivot, rtriRepayment, RTRI_LIQUIDITY_CAP_PAYROLL } from "@/lib/programs/calculators";
import { QUESTIONS, scoreAssessment, bandFor, answeredCount, type Answers } from "@/lib/assessment";

describe("REDIP calculator", () => {
  it("80% under $500K", () => expect(redipShare(200_000)).toEqual({ rate: 0.8, grant: 160_000, applicant: 40_000, capped: false }));
  it("60% at $500K and above, capped at $1M", () => {
    expect(redipShare(500_000).grant).toBe(300_000);
    const big = redipShare(2_000_000);
    expect(big.grant).toBe(1_000_000);
    expect(big.capped).toBe(true);
  });
  it("handles junk input", () => expect(redipShare(Number.NaN).grant).toBe(0));
});

describe("RTRI calculators", () => {
  it("liquidity = 50% of 12 months payroll", () => expect(rtriLiquidity(100_000)).toMatchObject({ support: 600_000, limitedBy: "payroll" }));
  it("caps at $2M", () => {
    expect(rtriLiquidity(500_000).support).toBe(2_000_000);
    expect(rtriLiquidity(500_000).limitedBy).toBe("cap");
    expect(Math.round(RTRI_LIQUIDITY_CAP_PAYROLL)).toBe(333_333);
  });
  it("limited by proven cash need", () => expect(rtriLiquidity(100_000, 250_000)).toMatchObject({ support: 250_000, limitedBy: "cash_need" }));
  it("pivot shares", () => {
    expect(rtriPivot(1_000_000, "non_repayable")).toEqual({ contribution: 500_000, applicant: 500_000, minPrivate: 100_000 });
    expect(rtriPivot(4_000_000, "non_repayable").contribution).toBe(1_000_000);
    expect(rtriPivot(1_000_000, "repayable").contribution).toBe(750_000);
  });
  it("repayment schedule", () => expect(rtriRepayment(600_000)).toEqual({ graceMonths: 12, payments: 60, monthly: 10_000 }));
});

describe("readiness assessment", () => {
  const all = (pick: (n: number) => number): Answers => Object.fromEntries([["stage", "growth"], ...QUESTIONS.map((q) => [q.id, pick(q.options.length)])]);
  it("perfect answers score 100, Investor-Grade, no gaps", () => {
    const r = scoreAssessment(all(() => 0));
    expect(r.score).toBe(100);
    expect(r.band.id).toBe("investor_grade");
    expect(r.topGaps).toHaveLength(0);
  });
  it("worst answers score 0, lead with non-dilutive paths", () => {
    const r = scoreAssessment({ ...all((n) => n - 1), stage: "seed" });
    expect(r.score).toBe(0);
    expect(r.band.id).toBe("early");
    expect(r.topGaps).toHaveLength(3);
    expect(r.pathsNow.every((p) => ["grants", "crowdfunding", "loans"].includes(p))).toBe(true);
  });
  it("weights pillars (financials 20% vs compliance 10%)", () => {
    const base = all((n) => n - 1);
    const fin = { ...base };
    const comp = { ...base };
    for (const q of QUESTIONS) {
      if (q.pillar === "financials") fin[q.id] = 0;
      if (q.pillar === "compliance") comp[q.id] = 0;
    }
    expect(scoreAssessment(fin).score).toBe(20);
    expect(scoreAssessment(comp).score).toBe(10);
  });
  it("bands", () => {
    expect([39, 40, 69, 70, 84, 85].map((s) => bandFor(s).id)).toEqual(["early", "developing", "developing", "ready", "ready", "investor_grade"]);
  });
  it("counts answers and ignores invalid indexes", () => {
    expect(answeredCount({ bm_model: 0, tr_revenue: "" })).toBe(1);
    expect(scoreAssessment({ bm_model: 99 }).pillarScores.business_model).toBe(0);
  });
});
