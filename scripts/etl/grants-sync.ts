/**
 * Grants mirror ETL.
 *
 * Streams the Government of Canada "Proactive Disclosure – Grants and Contributions" CSV (~2.3 GB, ~1.3M rows)
 * into public.grants_staging with COPY, then calls public.fl_promote_grants() to dedupe amendments,
 * drop individuals and upsert into public.grants_mirror.
 *
 *   npm run etl:grants                       # full refresh from GRANTS_CSV_URL
 *   npm run etl:grants -- --file grants.csv  # from a local download
 *   npm run etl:grants -- --limit 20000      # quick sample (no deletion of rows missing from the sample)
 *
 * Needs DATABASE_URL (direct or session-pooler connection; COPY does not work through the transaction pooler).
 * Data licence: Open Government Licence – Canada.
 */
import { createReadStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import pg from "pg";
import { from as copyFrom } from "pg-copy-streams";

const COLUMNS = [
  "ref_number", "amendment_number", "amendment_date", "agreement_type", "recipient_type",
  "recipient_business_number", "recipient_legal_name", "recipient_operating_name", "recipient_province",
  "recipient_city", "recipient_postal_code", "prog_name_en", "agreement_title_en", "agreement_value",
  "agreement_start_date", "agreement_end_date", "description_en", "naics_identifier", "owner_org", "owner_org_title",
] as const;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function source(): Promise<{ stream: Readable; label: string }> {
  const file = arg("file");
  if (file) return { stream: createReadStream(file), label: file };
  const url = process.env.GRANTS_CSV_URL;
  if (!url) throw new Error("Set GRANTS_CSV_URL or pass --file");
  const res = await fetch(url, { headers: { "User-Agent": "FundingLab-GrantsMirror/1.0 (+https://fundinglab.ca)" } });
  if (!res.ok || !res.body) throw new Error(`Download failed: HTTP ${res.status}`);
  return { stream: Readable.fromWeb(res.body as unknown as WebReadableStream), label: url };
}

async function main() {
  const limit = arg("limit") ? Number(arg("limit")) : undefined;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Set DATABASE_URL");

  const client = new pg.Client({ connectionString: databaseUrl, application_name: "grants-sync" });
  await client.connect();
  const { stream, label } = await source();
  const { rows } = await client.query<{ id: string }>(
    "insert into public.grant_sync_runs (source_url) values ($1) returning id",
    [label],
  );
  const runId = Number(rows[0].id);
  console.log(`grants-sync run ${runId} from ${label}${limit ? ` (limit ${limit})` : ""}`);

  let seen = 0;
  const started = Date.now();
  try {
    await client.query("truncate public.grants_staging");
    const copy = client.query(copyFrom(`copy public.grants_staging (${COLUMNS.join(",")}) from stdin with (format csv)`));

    const pick = new Transform({
      objectMode: true,
      transform(record: Record<string, string>, _enc, cb) {
        if (limit && seen >= limit) return cb();
        seen++;
        if (seen % 100_000 === 0) console.log(`  ${seen.toLocaleString()} rows`);
        cb(null, COLUMNS.map((c) => record[c] ?? ""));
      },
    });

    await pipeline(
      stream,
      parse({ columns: true, bom: true, relax_quotes: true, relax_column_count: true, skip_empty_lines: true, to: limit }),
      pick,
      stringify(),
      copy,
    );

    await client.query("update public.grant_sync_runs set rows_loaded = $2 where id = $1", [runId, seen]);
    console.log(`Loaded ${seen.toLocaleString()} rows into staging in ${Math.round((Date.now() - started) / 1000)}s. Promoting…`);

    await client.query("set statement_timeout = 0");
    const promoted = await client.query("select public.fl_promote_grants($1, $2) as r", [runId, !limit]);
    console.log("Done:", promoted.rows[0].r);
  } catch (err) {
    await client
      .query("update public.grant_sync_runs set status = 'failed', finished_at = now(), error = $2 where id = $1", [
        runId,
        String(err instanceof Error ? err.message : err).slice(0, 2000),
      ])
      .catch(() => undefined);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
