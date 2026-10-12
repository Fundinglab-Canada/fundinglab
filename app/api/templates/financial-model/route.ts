import { NextResponse } from "next/server";
import { toCsv } from "@/lib/format";

/** 3-statement financial model template (Prep Studio). Plain CSV so it opens anywhere. */
export async function GET() {
  const years = ["Last year (actual)", "Year 1", "Year 2", "Year 3"];
  const block = (title: string, rows: string[]) => [[title, ...years], ...rows.map((r) => [r, "", "", "", ""]), []];
  const csv = toCsv([
    ["Funding Lab — 3-statement financial model template (CAD)"],
    ["Fill in actuals first, then assumptions. Totals: use your spreadsheet's SUM formulas."],
    [],
    ...block("ASSUMPTIONS", ["Units sold / customers", "Average price", "Revenue growth %", "Gross margin %", "Headcount (end of year)", "Average salary", "Interest rate on debt %"]),
    ...block("INCOME STATEMENT", ["Revenue", "Cost of goods sold", "Gross profit", "Salaries and benefits", "Rent and utilities", "Sales and marketing", "General and administrative", "Research and development", "EBITDA", "Depreciation", "Interest", "Income tax", "Net income"]),
    ...block("BALANCE SHEET", ["Cash", "Accounts receivable", "Inventory", "Equipment (net)", "Total assets", "Accounts payable", "Loans", "Total liabilities", "Share capital", "Retained earnings", "Total equity", "Check: assets − liabilities − equity (should be 0)"]),
    ...block("CASH FLOW", ["Net income", "Add back depreciation", "Change in receivables", "Change in inventory", "Change in payables", "Cash from operations", "Equipment purchases", "Cash from investing", "Loans drawn / (repaid)", "Equity raised", "Grants received", "Cash from financing", "Net change in cash", "Ending cash"]),
  ]);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="funding-lab-financial-model-template.csv"' },
  });
}
