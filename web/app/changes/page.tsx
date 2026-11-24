import Link from "next/link";
import { q } from "@/lib/db";
import { StateBadge, stars } from "@/lib/ui";
export const revalidate = 300;

export default async function Changes() {
  const reviews = await q("SELECT * FROM reviews ORDER BY effective_date DESC, revision DESC");
  const all = await q("SELECT ch.*, c.name FROM changes ch JOIN companies c ON c.ticker=ch.ticker WHERE ch.superseded_by IS NULL");
  return (<>
    <h1>What changed</h1>
    {reviews.map((r: any) => {
      const ch = all.filter((c: any) => c.review_id === r.id);
      const of = (k: string) => ch.filter((c: any) => c.kind === k);
      const stayed = ch.filter((c: any) => c.kind === "stayed" || c.kind === "baseline");
      return (<div className="card" key={r.id}>
        <b>{r.notice_no}</b> · effective {r.effective_date} <StateBadge state={r.state} /> {r.pdf_url && <a href={r.pdf_url}>PDF</a>}
        {r.is_baseline ? <p className="mut">Baseline: first review with star ratings. {stayed.length} companies.</p> : null}
        {of("dropped").length > 0 && <div className="band"><b>Dropped</b><ul>{of("dropped").map((c: any) => {
          const d = c.detail ? JSON.parse(c.detail) : null;
          return <li key={c.ticker}><Link href={`/company/${c.ticker}`}>{c.ticker}</Link> {c.name}: 5 → {stars(c.new_status)}{d ? ` (${d.shariah_status})` : ""}</li>; })}</ul></div>}
        {[...of("new"), ...of("returned")].length > 0 && <div style={{ background: "var(--grnbg)", color: "var(--grn)", padding: "10px 14px", borderRadius: 8 }}><b>New / Returned</b><ul>
          {[...of("new"), ...of("returned")].map((c: any) => <li key={c.ticker}><Link href={`/company/${c.ticker}`}>{c.ticker}</Link> {c.name} ({c.kind})</li>)}</ul></div>}
        {!r.is_baseline && <details><summary>Stayed: {stayed.length}</summary>{stayed.map((c: any) => c.ticker).join(", ")}</details>}
      </div>);
    })}
  </>);
}
