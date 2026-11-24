import Link from "next/link";
import { q, latestReview } from "@/lib/db";
import { fmt, StateBadge } from "@/lib/ui";
export const revalidate = 300;

export default async function Home() {
  const rev = await latestReview();
  if (!rev) return <p>No review ingested yet.</p>;
  const rows = await q(`
    SELECT c.ticker, c.name, c.sector, ch.kind,
      (SELECT close FROM prices_daily p WHERE p.ticker=c.ticker ORDER BY session_date DESC LIMIT 1) AS price,
      (SELECT change_pct FROM prices_daily p WHERE p.ticker=c.ticker ORDER BY session_date DESC LIMIT 1) AS chg,
      (SELECT market_cap FROM company_snapshot s WHERE s.ticker=c.ticker ORDER BY fetched_at DESC LIMIT 1) AS mcap,
      (SELECT notice_no FROM reviews r JOIN changes x ON x.review_id=r.id
         WHERE x.ticker=c.ticker AND x.kind IN ('baseline','new','returned') ORDER BY r.effective_date DESC LIMIT 1) AS since
    FROM changes ch JOIN companies c ON c.ticker=ch.ticker
    WHERE ch.review_id=? AND ch.kind IN ('baseline','stayed','new','returned') ORDER BY c.ticker`, [rev.id]);
  const dropped = await q("SELECT ticker FROM changes WHERE review_id=? AND kind='dropped'", [rev.id]);
  return (<>
    <h1>Five-star Shariah list</h1>
    <p className="mut">{rev.notice_no} · notice {rev.notice_date} · effective {rev.effective_date} · <StateBadge state={rev.state} /> · {rows.length} companies{" "}
      {rev.pdf_url && <>· <a href={rev.pdf_url}>PSX notice (PDF)</a></>}</p>
    {dropped.length > 0 && <div className="banner">Latest review: {dropped.length} dropped. <Link href="/changes">See what changed</Link></div>}
    <div className="table"><table>
      <thead><tr><th>Ticker</th><th>Company</th><th>Price</th><th>Day %</th><th>Market cap</th><th>Since</th><th></th></tr></thead>
      <tbody>{rows.map((r: any) => (<tr key={r.ticker}>
        <td><Link href={`/company/${r.ticker}`}><b>{r.ticker}</b></Link></td><td>{r.name}</td>
        <td>{fmt(r.price)}</td><td>{fmt(r.chg, 2, "%")}</td><td>{fmt(r.mcap, 0)}</td><td>{r.since}</td>
        <td><span className={`badge ${r.kind}`}>{r.kind === "stayed" ? "" : r.kind}</span></td></tr>))}</tbody>
    </table></div>
  </>);
}
