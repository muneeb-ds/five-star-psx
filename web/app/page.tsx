import Link from "next/link";
import { q, latestReview } from "@/lib/db";
import { compact, fmt, StateBadge } from "@/lib/ui";
import Explorer, { Row } from "@/components/Explorer";
export const revalidate = 300;

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

export default async function Home() {
  const rev = await latestReview();
  if (!rev) return <><h1>No review loaded yet</h1><p className="lede">Run the “Ingest PSX notice” workflow on GitHub to load the first review.</p></>;
  const rows = (await q(`
    SELECT c.ticker, c.name, c.sector, ch.kind,
      (SELECT close FROM prices_daily p WHERE p.ticker=c.ticker ORDER BY session_date DESC LIMIT 1) AS price,
      (SELECT change_pct FROM prices_daily p WHERE p.ticker=c.ticker ORDER BY session_date DESC LIMIT 1) AS chg,
      (SELECT market_cap FROM company_snapshot s WHERE s.ticker=c.ticker ORDER BY fetched_at DESC LIMIT 1) AS mcap,
      (SELECT pe FROM company_snapshot s WHERE s.ticker=c.ticker ORDER BY fetched_at DESC LIMIT 1) AS pe
    FROM changes ch JOIN companies c ON c.ticker=ch.ticker
    WHERE ch.review_id=? AND ch.kind IN ('baseline','stayed','new','returned') ORDER BY c.ticker`, [rev.id])) as Row[];
  // SELECT * so a database that has not been migrated yet (no div_yield column) still renders.
  const snaps = (await q("SELECT * FROM company_snapshot ORDER BY fetched_at")) as any[];
  const dyBy = new Map(snaps.map((x) => [x.ticker, x.div_yield ?? null]));
  rows.forEach((r) => { r.dy = dyBy.get(r.ticker) ?? null; });
  const dropped = await q("SELECT ticker FROM changes WHERE review_id=? AND kind='dropped'", [rev.id]);
  const asOf = (await q("SELECT MAX(session_date) AS d FROM prices_daily"))[0]?.d as string | undefined;
  const total = rows.reduce((s, r) => s + (r.mcap ?? 0), 0);
  const pes = rows.map((r) => r.pe).filter((v): v is number => !!v && v > 0);
  const dys = rows.map((r) => r.dy).filter((v): v is number => !!v && v > 0);
  const nSectors = new Set(rows.map((r) => r.sector ?? "Other")).size;
  const payers = dys.length;

  return (
    <>
      <h1>{rows.length} PSX companies hold five stars</h1>
      <p className="lede">The non-financial companies PSX rates at the top Shariah level in {rev.notice_no}. All three debt, investment and income ratios are 0%.</p>
      <div className="meta">
        <span>Notice dated {rev.notice_date}</span>
        <span>Effective {rev.effective_date}</span>
        <StateBadge state={rev.state} />
        {rev.pdf_url && <a href={rev.pdf_url}>Read the PSX notice</a>}
      </div>
      {dropped.length > 0 && <div className="banner">{dropped.length} {dropped.length === 1 ? "company dropped" : "companies dropped"} at the latest review. <Link href="/changes">See what changed</Link></div>}

      <div className="stats">
        <div className="stat"><b>{compact(total)}</b><span>Combined market cap (Rs)</span></div>
        <div className="stat"><b>{nSectors}</b><span>Sectors represented</span></div>
        <div className="stat"><b>{median(pes) === null ? "–" : fmt(median(pes), 1)}</b><span>Median P/E</span></div>
        <div className="stat"><b>{payers}</b><span>Pay a dividend (yield {dys.length ? fmt(median(dys), 1, "%") : "–"} median)</span></div>
      </div>
      <Explorer rows={rows} />
      <p className="mut" style={{ marginTop: 14 }}>{asOf ? `Prices as of ${asOf}. ` : ""}Click any row to open the company. Strip width shows market cap.</p>
    </>
  );
}
