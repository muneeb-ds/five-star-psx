import { notFound } from "next/navigation";
import { q } from "@/lib/db";
import { fmt, stars } from "@/lib/ui";
export const revalidate = 300;

const LIMITS = [["Debt / assets", "debt_ratio", "< 33%"], ["Non-compliant investments", "investment_ratio", "< 33% (PSX: NCInv/TA)"],
  ["Non-compliant income", "income_ratio", "< 5%"], ["Illiquid assets", "illiquid_ratio", "≥ 25%"], ["Net liquid assets / share", "nla_per_share", "below share price"]];

export default async function Company({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const [co] = await q("SELECT * FROM companies WHERE ticker=?", [t]);
  if (!co) notFound();
  const hist = await q(`SELECT r.notice_no, r.effective_date, r.pdf_url, x.* FROM ratings x JOIN reviews r ON r.id=x.review_id WHERE x.ticker=? ORDER BY r.effective_date`, [t]);
  const latest: any = hist[hist.length - 1];
  const [lastReview] = await q("SELECT * FROM reviews ORDER BY effective_date DESC LIMIT 1");
  const snap = (await q("SELECT * FROM company_snapshot WHERE ticker=? ORDER BY fetched_at DESC LIMIT 1", [t]))[0] as any;
  const px = (await q("SELECT * FROM prices_daily WHERE ticker=? ORDER BY session_date DESC LIMIT 1", [t]))[0] as any;
  const ann = await q("SELECT * FROM announcements WHERE ticker=? ORDER BY date DESC LIMIT 20", [t]);
  const fin = await q("SELECT * FROM financials WHERE ticker=? ORDER BY item, year DESC", [t]);
  const finYears = [...new Set(fin.map((f: any) => f.year))].sort((a: any, b: any) => b - a);
  const finItems = [...new Set(fin.map((f: any) => f.item))];
  const divs = await q("SELECT * FROM dividends WHERE ticker=? ORDER BY announced_on DESC", [t]);
  const alh = (await q("SELECT * FROM alhilal_status WHERE ticker=? ORDER BY report_period DESC LIMIT 1", [t]))[0] as any;
  const out = !latest || latest.star_rating !== "5" || latest.review_id !== lastReview?.id;
  return (<>
    <h1>{co.name} <span className="mut">({t})</span></h1>
    <p><a href={`https://dps.psx.com.pk/company/${t}`}>PSX company page</a></p>
    {out && latest && <div className="band">No longer five-star since {lastReview?.notice_no}: now {stars(latest.star_rating)} ({latest.shariah_status}).</div>}
    <h2>Shariah</h2>
    <p>{hist.map((h: any) => <span key={h.notice_no} className="badge" style={{ marginRight: 6 }} title={h.notice_no}>{h.effective_date}: {stars(h.star_rating)}</span>)}</p>
    {latest && <div className="table"><table><thead><tr><th>Ratio (latest review)</th><th>Value</th><th>PSX limit</th></tr></thead><tbody>
      {LIMITS.map(([l, k, lim]) => <tr key={k}><td>{l}</td><td>{fmt(latest[k], 2, k === "nla_per_share" ? "" : "%")}</td><td className="mut">{lim}</td></tr>)}
    </tbody></table></div>}
    <p className="mut">Al-Hilal status: {alh ? `${alh.status} (${alh.report_period})` : "not loaded yet"}. Sources: {hist.map((h: any) => h.pdf_url && <a key={h.notice_no} href={h.pdf_url}>{h.notice_no} </a>)}</p>
    <h2>Market</h2>
    {px ? <p>Close {fmt(px.close)} ({fmt(px.change_pct, 2, "%")}) · {px.session_date}{snap && <> · Market cap {fmt(snap.market_cap, 0)} · P/E {fmt(snap.pe)} · Free float {fmt(snap.free_float)} · 52w {fmt(snap.low_52w)}–{fmt(snap.high_52w)}</>}</p> : <p className="mut">Market data is not available yet (Phase 3).</p>}
    <h2>Financials</h2>
    {fin.length ? <><p className="mut">Annual, thousands of PKR except EPS. Source: PSX.</p><div className="table"><table><thead><tr><th></th>{finYears.map((y: any) => <th key={y}>{y}</th>)}</tr></thead>
      <tbody>{finItems.map((it: any) => <tr key={it}><td>{it}</td>{finYears.map((y: any) => { const f: any = fin.find((x: any) => x.item === it && x.year === y); return <td key={y}>{f ? fmt(f.value) : "–"}</td>; })}</tr>)}</tbody></table></div></> : <p className="mut">No financials loaded yet.</p>}
    <h2>Dividends &amp; purification</h2>
    {divs.length ? <ul>{divs.map((d: any) => <li key={d.id}>{d.announced_on}: {fmt(d.amount_per_share)} per share (closure {d.book_closure ?? "–"}). Purification: {fmt(d.amount_per_share * (latest?.income_ratio ?? 0) / 100, 4)} per share</li>)}</ul>
      : <p className="mut">No dividends recorded. For five-star companies the purification amount is normally zero.</p>}
    <h2>Announcements</h2>
    {ann.length ? <ul>{ann.map((a: any, i) => <li key={i}>{a.date} — <a href={a.url}>{a.title}</a></li>)}</ul> : <p className="mut">None recorded yet.</p>}
  </>);
}
