import "server-only";
import { buildIcs } from "@/lib/ics";
import { zonedTime } from "@/lib/time";

export const COHORT_TOPICS = [
  "Know your stage & funding options",
  "Build your funding roadmap & capital stack",
  "Grants, tax credits & wage subsidies",
  "Loans & lender-ready financials",
  "Pitch deck & business plan",
  "Data room & due diligence",
  "Investors: angels, VCs, crowdfunding & term sheets",
  "Pitch day & next steps",
];

export type CohortSession = { week_number: number; starts_at: string; topic: string };

/** Weekly Friday 08:00 PT sessions, used when the DB schedule isn't available. */
export function defaultSchedule(startDate: string): CohortSession[] {
  return COHORT_TOPICS.map((topic, i) => {
    const d = new Date(`${startDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return { week_number: i + 1, starts_at: zonedTime(`${d.toISOString().slice(0, 10)}T08:00:00`, "America/Vancouver").toISOString(), topic };
  });
}

export function cohortIcs(cohortName: string, sessions: CohortSession[], joinUrl?: string | null) {
  return buildIcs(
    sessions.map((s) => ({
      uid: `cohort-${cohortName.replace(/\W+/g, "-").toLowerCase()}-w${s.week_number}`,
      start: new Date(s.starts_at),
      durationMinutes: 90,
      title: `Road to Funding — Week ${s.week_number}: ${s.topic}`,
      description: `Funding Lab Road to Funding cohort, week ${s.week_number}.${joinUrl ? `\nJoin: ${joinUrl}` : ""}`,
      url: joinUrl ?? undefined,
    })),
    "Road to Funding",
  );
}
