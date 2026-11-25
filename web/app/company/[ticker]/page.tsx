import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { q } from "@/lib/db";
import { compact, cls, fmt, signed, stars, titleCase } from "@/lib/ui";
import { Bars, Gauge, LineChart } from "@/lib/charts";
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params;
  const [co] = await q("SELECT name FROM companies WHERE ticker=?", [ticker.toUpperCase()]);
  return { title: co ? `${ticker.toUpperCase()}, ${co.name}` : "Company" };
}

export default async function Company({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();
  const [co] = (await q("SELECT * FROM companies WHERE ticker=?", [t])) as any[];
  if (!co) notFound();
  const hist = (await q(`SELECT r.id AS rid, r.notice_no, r.effective_date, r.pdf_url, x.* FROM ratings x JOIN reviews r ON r.id=x.review_id WHERE x.ticker=? ORDER BY r.effective_date`, [t])) as any[];
  const latest = hist[hist.length - 1];
  const [lastReview] = (await q("SELECT * FROM reviews ORDER BY effective_date DESC, revision DESC LIMIT 1")) as any[];
  const snap = (await q("SELECT * FROM company_snapshot WHERE ticker=? ORDER BY fetched_at DESC LIMIT 1", [t]))[0] as any;
  const prices = (await q("SELECT session_date, close, change_pct FROM prices_daily WHERE ticker=? ORDER BY session_date", [t])) as any[];
  const px = prices[prices.length - 1];
  const fin = (await q("SELECT * FROM financials WHERE ticker=? ORDER BY year", [t])) as any[];
  const events = (await q("SELECT * FROM dividend_events WHERE ticker=? ORDER BY event_date DESC", [t])) as any[];
  const divs = (await q("SELECT * FROM dividends WHERE ticker=? ORDER BY announced_on DESC", [t])) as any[];
  const ann = (await q("SELECT * FROM announcements WHERE ticker=? ORDER BY date DESC LIMIT 20", [t])) as any[];

  const out = !latest || latest.star_rating !== "5" || latest.rid !== lastReview?.id;
  const price = px?.close ?? null;
  const range = snap && snap.high_52w > 0 ? snap : null;
  const rangePos = range && price ? Math.min(100, Math.max(0, ((price - range.low_52w) / (range.high_52w - range.low_52w)) * 100)) : null;
  const items = [...new Set(fin.map((f) => f.item))] as string[];
  const years = [...new Set(fin.map((f) => f.year))].sort() as number[];
  const income = latest?.income_ratio ?? 0;

  return (
    <>
      <h1>{co.name}</h1>
      <div className="meta">
        <b>{t}</b>
        {co.sector && <span>{titleCase(co.sector)}</span>}
        {!out && <span className="pill pass">Five stars</span>}
        <a href={`https://dps.psx.com.pk/company/${t}`}>PSX company page</a>
      </div>
      {out && latest && <div className="band">No longer five-star since {lastReview?.notice_no}. PSX now shows {stars(latest.star_rating)} and {latest.shariah_status}. This app treats it as non-compliant.</div>}
      {co.psx_tag && /NON/i.test(co.psx_tag) && !out && <div className="note">PSX’s own company page currently tags this company “{co.psx_tag}”. Check the notice before relying on the rating.</div>}

      <div className="kf">
        <div><b>{price === null ? "–" : `Rs ${fmt(price)}`}</b><span>Last close{px ? `, ${px.session_date}` : ""}</span></div>
        <div><b className={cls(px?.change_pct)}>{signed(px?.change_pct)}</b><span>Day change</span></div>
        <div><b>{compact(snap?.market_cap)}</b><span>Market cap (Rs)</span></div>
        <div><b>{snap?.pe ? fmt(snap.pe, 1) : "–"}</b><span>P/E ratio</span></div>
        <div><b>{snap?.div_yield ? fmt(snap.div_yield, 2, "%") : "–"}</b><span>Dividend yield</span></div>
        <div><b className={cls(snap?.change_1y)}>{signed(snap?.change_1y, 1)}</b><span>One-year change</span></div>
        <div>
          <b>{snap?.free_float ? fmt(snap.free_float, 1, "%") : "–"}</b><span>Free float</span>
        </div>
        <div>
          <b>{range ? `${fmt(range.low_52w)} to ${fmt(range.high_52w)}` : "–"}</b>
          {rangePos !== null && <div className="rangebar" aria-hidden><i style={{ left: `calc(${rangePos}% - 1px)` }} /></div>}
          <span>52-week range</span>
        </div>
      </div>

      <h2>Price</h2>
      {prices.length >= 2 ? <LineChart points={prices.map((p) => ({ x: p.session_date, y: p.close }))} /> :
        <p className="mut">PSX no longer provides price history, so this site records one closing price per trading day from {prices[0]?.session_date ?? "its first run"}. The chart appears once there are two days.</p>}

      <h2>Shariah screening</h2>
      <p className="mut">
        Rating by review: {hist.map((h, i) => <span key={h.notice_no}>{i ? ", " : ""}{stars(h.star_rating)} at {h.notice_no}</span>)}.
        {" "}Source: {hist.map((h) => h.pdf_url ? <a key={h.notice_no} href={h.pdf_url}>{h.notice_no}</a> : null)}
      </p>
      {latest && (
        <div className="gauges">
          <Gauge title="Debt to assets" value={latest.debt_ratio} limit={33} kind="max" scaleMax={41} />
          <Gauge title="Non-compliant investments to assets" value={latest.investment_ratio} limit={33} kind="max" scaleMax={41} />
          <Gauge title="Non-compliant income to revenue" value={latest.income_ratio} limit={5} kind="max" scaleMax={6.25} />
          <Gauge title="Illiquid assets to assets" value={latest.illiquid_ratio} limit={25} kind="min" scaleMax={100} />
          <p className="mut" style={{ margin: 0 }}>Net liquid assets per share: {fmt(latest.nla_per_share)} against a share price of Rs {fmt(latest.price_jun30)} on 30 June 2026. PSX requires net liquid assets per share to be below the price. Al-Hilal’s separate status is not loaded yet.</p>
        </div>
      )}

      <h2>Financials</h2>
      {items.length ? (
        <>
          <p className="mut">Annual figures in thousands of rupees, except EPS. Source: PSX company page.</p>
          <div className="charts">
            {items.filter((it) => fin.filter((f) => f.item === it).length >= 2).slice(0, 4).map((it) => (
              <div key={it}><h3>{it}</h3><Bars label={it} data={fin.filter((f) => f.item === it).map((f) => ({ label: String(f.year), value: f.value }))} /></div>
            ))}
          </div>
          <div className="tablewrap" style={{ marginTop: 20 }}>
            <table><thead><tr><th></th>{[...years].reverse().map((y) => <th key={y} className="r">{y}</th>)}</tr></thead>
              <tbody>{items.map((it) => <tr key={it}><td>{it}</td>{[...years].reverse().map((y) => { const f = fin.find((x) => x.item === it && x.year === y); return <td key={y} className={`r ${cls(f?.value)}`}>{f ? fmt(f.value) : "–"}</td>; })}</tr>)}</tbody></table>
          </div>
        </>
      ) : <p className="mut">PSX shows no annual figures for this company yet.</p>}

      <h2>Dividends and purification</h2>
      {divs.length > 0 && (
        <div className="tablewrap"><table>
          <thead><tr><th>Announced</th><th>Book closure</th><th className="r">Per share (Rs)</th><th className="r">Purification per share (Rs)</th></tr></thead>
          <tbody>{divs.map((d) => <tr key={d.id}><td>{d.announced_on}</td><td>{d.book_closure ?? "–"}</td><td className="r">{fmt(d.amount_per_share, 4)}</td><td className="r">{fmt((d.amount_per_share * income) / 100, 4)}</td></tr>)}</tbody>
        </table></div>
      )}
      {events.length > 0 ? (
        <>
          <p className="mut" style={{ marginTop: divs.length ? 18 : 0 }}>Dividend events found in PSX announcements. PSX puts the per-share amount in the attached document, so amounts are added by hand in <code>manual/dividends.csv</code>.</p>
          <ul className="plain">{events.map((e, i) => <li key={i}><time>{e.event_date}</time><span>{e.title.trim()} <span className="pill">{e.kind === "other" ? "Dividend" : e.kind === "interim" ? "Interim" : "Final"}</span></span></li>)}</ul>
        </>
      ) : !divs.length && <p className="mut">No dividend announcements in PSX’s recent list for this company.</p>}
      <p className="mut" style={{ marginTop: 14 }}>
        Purification is the part of a dividend that comes from non-compliant income: dividend × income ratio. This company’s income ratio is {fmt(income, 2, "%")}{income === 0 ? ", so nothing needs purifying" : ""}.
      </p>

      <h2>Announcements</h2>
      {ann.length ? <ul className="plain">{ann.map((a, i) => <li key={i}><time>{a.date}</time><a href={a.url}>{a.title.trim()}</a></li>)}</ul> : <p className="mut">No announcements loaded yet.</p>}
    </>
  );
}
