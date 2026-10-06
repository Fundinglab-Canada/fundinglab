import { describe, expect, it } from "vitest";
import { normalizeName } from "@/lib/grants/normalize";
import { classifyLookup, type GrantLookupRow } from "@/lib/grants/classify";
import { rankPartners, scoreMatch } from "@/lib/matching/score";
import { readiness } from "@/lib/readiness";
import { money, slugify, toCsv } from "@/lib/format";

describe("normalizeName (mirrors fl_normalize_name)", () => {
  it.each([
    ["NORTHWIND ROBOTICS INC.", "northwind robotics"],
    ["Société Générale Ltée", "societe generale"],
    ["A&W Food Services of Canada Corp", "a and w food services of canada"],
    ["  Coastal   Biologics, Ltd ", "coastal biologics"],
  ])("%s -> %s", (input, out) => expect(normalizeName(input)).toBe(out));
});

const row = (o: Partial<GrantLookupRow>): GrantLookupRow => ({
  owner_org: "nrc-cnrc", ref_number: Math.random().toString(), recipient_legal_name: "Northwind Robotics Inc.",
  recipient_operating_name: null, recipient_city: "Burnaby", recipient_province: "BC", prog_name_en: "IRAP",
  owner_org_title: "National Research Council Canada", agreement_type: "C", agreement_value: 100000,
  agreement_start_date: "2024-06-03", description_en: null, amendment_number: 0, legal_norm: "northwind robotics",
  score: 1, match_kind: "exact", same_province: true, same_city: true, ...o,
});

describe("classifyLookup", () => {
  it("shows a confident exact match with total", () => {
    const r = classifyLookup([row({ agreement_value: 148500 }), row({ agreement_value: 37200, agreement_start_date: "2025-02-11" })]);
    expect(r.state).toBe("match");
    if (r.state === "match") {
      expect(r.total).toBe(185700);
      expect(r.grants[0].date).toBe("2025-02-11");
    }
  });
  it("requires same city and province for fuzzy >= 0.9", () => {
    const r = classifyLookup([row({ match_kind: "fuzzy", score: 0.93, same_city: false })]);
    expect(r.state).toBe("possible");
  });
  it("asks when two entities match exactly (same name, different provinces)", () => {
    const r = classifyLookup([row({}), row({ legal_norm: "northwind robotics ", recipient_province: "ON" })]);
    expect(r.state).toBe("possible");
  });
  it("shows nothing when nothing is plausible", () => {
    expect(classifyLookup([row({ match_kind: "fuzzy", score: 0.4 })]).state).toBe("none");
    expect(classifyLookup([]).state).toBe("none");
  });
  it("drops rejected candidates", () => {
    const r = classifyLookup([row({ match_kind: "fuzzy", score: 0.7 })], ["northwind robotics"]);
    expect(r.state).toBe("none");
  });
});

describe("scoreMatch", () => {
  const biz = { stage: "growth", industry: "advanced_manufacturing", province: "BC", amount_sought: 1_500_000, use_of_funds: ["hire_staff", "rd", "ip_patent"] };
  it("scores a VC in range highly", () => {
    const r = scoreMatch(biz, { type: "venture_capital", stages: ["seed", "growth"], industries: ["advanced_manufacturing"], provinces: ["BC"], min_amount: 500_000, max_amount: 3_000_000, uses_of_funds: [] });
    expect(r.score).toBe(85);
    expect(r.breakdown).toEqual({ stage: 30, industry: 20, geography: 15, ticket: 20, use: 0, readiness: 0 });
    expect(r.reasons).toContain("cheque range");
  });
  it("routes IP filing to a lawyer", () => {
    const r = scoreMatch(biz, { type: "commercial_lawyer", stages: ["growth"], industries: [], provinces: [], min_amount: null, max_amount: null, uses_of_funds: [] });
    expect(r.reasons).toContain("IP filing → lawyer");
    expect(r.score).toBe(95);
  });
  it("penalises out-of-stage, out-of-range funders", () => {
    const r = scoreMatch(biz, { type: "private_equity", stages: ["exit"], industries: ["consumer"], provinces: ["AB"], min_amount: 3_000_000, max_amount: 25_000_000, uses_of_funds: [] });
    expect(r.score).toBeLessThan(20);
  });
  it("adds the readiness bonus at 70+", () => {
    const p = { type: "venture_capital", stages: ["growth"], industries: [], provinces: [], min_amount: null, max_amount: null, uses_of_funds: [] };
    expect(scoreMatch({ ...biz, readiness_score: 72 }, p).breakdown.readiness).toBe(5);
    expect(scoreMatch({ ...biz, readiness_score: 69 }, p).breakdown.readiness).toBe(0);
  });
  it("routes hiring to recruiters", () => {
    const r = scoreMatch(biz, { type: "recruiter", stages: ["growth"], industries: [], provinces: [], min_amount: null, max_amount: null, uses_of_funds: [] });
    expect(r.reasons).toContain("hiring → recruitment");
  });
  it("ranks", () => {
    const ranked = rankPartners(biz, [
      { type: "private_equity", stages: ["exit"], industries: [], provinces: [], min_amount: 3e6, max_amount: 2.5e7, uses_of_funds: [] },
      { type: "grant_writer", stages: ["growth"], industries: [], provinces: [], min_amount: null, max_amount: null, uses_of_funds: ["hire_staff"] },
    ]);
    expect(ranked[0].partner.type).toBe("grant_writer");
  });
});

describe("readiness", () => {
  it("matches the prototype sample (73)", () => {
    const r = readiness({ stage: "growth", years_in_business: 6, annual_revenue: 2_100_000, documents: ["pitch_deck", "financials"], funding_history_count: 2, has_basics: true });
    expect(r.total).toBe(73);
  });
  it("is bounded 0–100", () => {
    const r = readiness({ stage: "exit", years_in_business: 40, annual_revenue: 1e9, documents: ["pitch_deck", "financials", "business_plan"], funding_history_count: 99, has_basics: true });
    expect(r.total).toBe(100);
  });
});

describe("format", () => {
  it("money", () => {
    expect(money(148500)).toBe("$148,500");
    expect(money(1_500_000, true)).toBe("$1.5M");
    expect(money(350_000, true)).toBe("$350K");
  });
  it("slugify", () => expect(slugify("Northwind Robotics Inc.")).toBe("northwind-robotics-inc"));
  it("csv neutralises formulas", () => expect(toCsv([["=SUM(A1)", 'a"b']])).toBe(`"'=SUM(A1)","a""b"`));
});

import { completeness } from "@/lib/readiness";
describe("completeness", () => {
  const b = { name: "X", industry: "tech", province: "BC", city: "Vancouver", legal_structure: "corporation", description: null, stage: "seed",
    amount_sought: 100000, use_of_funds: ["rd"], revenue_12m: null, customers: null, consent_matching: false };
  it("counts done items", () => {
    const r = completeness({ business: b, documents: ["pitch_deck"], historyCount: 0, hasAssessment: false });
    expect(r.items.filter((i) => i.done).map((i) => i.id)).toEqual(["basics", "stage", "need", "pitch_deck"]);
    expect(r.pct).toBe(36);
  });
});

import { zonedTime } from "@/lib/time";
import { parseRow } from "@/lib/admin/tables";
describe("zonedTime", () => {
  it("handles PDT and PST", () => {
    expect(zonedTime("2026-07-07T08:00", "America/Vancouver").toISOString()).toBe("2026-07-07T15:00:00.000Z");
    expect(zonedTime("2026-12-01T08:00:00", "America/Vancouver").toISOString()).toBe("2026-12-01T16:00:00.000Z");
  });
});
describe("parseRow (admin whitelist)", () => {
  it("parses and validates", () => {
    const f = new FormData();
    f.set("starts_at", "2026-11-03T08:00"); f.set("topic", "Grants 101"); f.set("status", "scheduled"); f.set("duration_minutes", "60");
    const r = parseRow("webinar_sessions", f);
    expect(r.starts_at).toBe("2026-11-03T16:00:00.000Z");
    expect(r.join_url).toBeNull();
    f.set("status", "bogus");
    expect(() => parseRow("webinar_sessions", f)).toThrow(/valid status/);
  });
  it("rejects non-https URLs", () => {
    const f = new FormData();
    f.set("name", "A"); f.set("title", "B"); f.set("member_group", "advisor"); f.set("linkedin_url", "javascript:alert(1)");
    expect(() => parseRow("team_members", f)).toThrow(/https/);
  });
});
