import { describe, expect, it } from "vitest";
import { isIndividual, nameMatches, parseResults } from "@/lib/grants/live";
import { snapshotSummary } from "@/lib/snapshot-summary";

const PAGE = `
<div class="row mrgn-bttm-xl mrgn-lft-md">
  <div class="row"><div class="col-sm-8"><h4 class="mrgn-tp-0 mrgn-bttm-sm"><a href="/grants/record/nrc-cnrc%2C172-2026-Q1-1%2Ccurrent">
    <mark>Maple</mark> Pantry Foods Ltd.</a></h4></div>
  <div class="col-sm-4 text-right"><h4 class="mrgn-tp-0 mrgn-bttm-sm">$72,000.00</h4><h5 class="mrgn-tp-0 mrgn-bttm-sm">Jan 10, 2023</h5></div></div>
  <div class="row mrgn-bttm-md"><div class="col-sm-12 mrgn-bttm-0"><p>For-profit organization</p></div>
    <div class="col-sm-12 mrgn-tp-0"><strong>Agreement:</strong> <p>Food line automation</p></div>
    <div class="col-sm-12"><strong>Organization:</strong> National Research Council Canada</div>
    <div class="col-sm-12"><strong>Program Name:</strong> Industrial Research Assistance Program</div>
    <div class="col-sm-12"><strong>Location:</strong> Langley, British Columbia, CA</div></div>
</div>
<div class="row mrgn-bttm-xl mrgn-lft-md">
  <div class="row"><div class="col-sm-8"><h4 class="mrgn-tp-0 mrgn-bttm-sm"><a href="/grants/record/nserc-crsng%2CGC-1%2Ccurrent">Doe, Jane (Maple Pantry Foods)</a></h4></div>
  <div class="col-sm-4 text-right"><h4 class="mrgn-tp-0 mrgn-bttm-sm">$4,500.00</h4></div></div>
</div>`;

describe("live grant search", () => {
  it("parses records from the results page", () => {
    const [r] = parseResults(PAGE);
    expect(r).toMatchObject({
      recipient: "Maple Pantry Foods Ltd.", ownerOrg: "nrc-cnrc", ref: "172-2026-Q1-1", amount: 72000, date: "2023-01-10",
      program: "Industrial Research Assistance Program", department: "National Research Council Canada", recipientType: "For-profit organization",
    });
  });
  it("never surfaces individuals", () => {
    const [biz, person] = parseResults(PAGE);
    expect(isIndividual(biz)).toBe(false);
    expect(isIndividual(person)).toBe(true);
  });
  it("matches typed words to the start of name words", () => {
    expect(nameMatches("maple pan", "Maple Pantry Foods Ltd.")).toBe(true);
    expect(nameMatches("pantry", "Maple Pantry Foods Ltd.")).toBe(true);
    expect(nameMatches("apple", "Maple Pantry Foods Ltd.")).toBe(false);
  });
});

describe("snapshot summary", () => {
  const base = {
    name: "Maple Pantry Foods", website: null, industry: "agrifood", province: "BC", city: "Langley", years_in_business: 4, stage: "growth",
    amount_sought: 500000, timeline: "3–6 months", use_of_funds: ["inventory_equipment"], hire_roles: null, annual_revenue: null, readiness_score: 64,
    funding_history: [{ source: "grant_federal", amount: 72000, year: 2023, program_name: "IRAP", department: "NRC", loan_subtype: null }],
    documents: ["business_plan"], revenue_12m: 1200000, growth_rate_pct: 35, customers: 40,
  };
  it("writes the who, traction, ask and readiness", () => {
    const text = snapshotSummary(base).join(" ");
    expect(text).toContain("Maple Pantry Foods is a Growth-stage Agriculture, Food & Beverage business based in Langley, BC, operating for 4 years");
    expect(text).toContain("$1,200,000 in revenue");
    expect(text).toContain("raised $72,000 to date, including IRAP");
    expect(text).toContain("seeking $500,000");
    expect(text).toContain("64/100");
  });
  it("uses the custom industry for Other and never invents traction", () => {
    const text = snapshotSummary({ ...base, industry: "other", industry_other: "Aquaculture", revenue_12m: null, growth_rate_pct: null, customers: null, funding_history: [] }).join(" ");
    expect(text).toContain("is a Growth-stage Aquaculture business");
    expect(text).not.toContain("pre-revenue");
    expect(text).not.toContain("reports");
    expect(text).toContain("has not raised outside funding yet");
  });
});
