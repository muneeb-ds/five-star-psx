import { q } from "@/lib/db";
import { StateBadge } from "@/lib/ui";
export const revalidate = 300;
export const metadata = { title: "Reviews" };
export default async function Reviews() {
  const rows = (await q(`SELECT r.*, (SELECT COUNT(*) FROM changes c WHERE c.review_id=r.id AND c.kind!='dropped') AS five FROM reviews r ORDER BY effective_date DESC`)) as any[];
  return (<><h1>Reviews</h1><p className="lede">Every PSX notice the site has read. PSX reviews the index twice a year.</p>
    <div className="tablewrap"><table>
      <thead><tr><th>Notice</th><th>Dated</th><th>Effective</th><th className="r">Five-star companies</th><th>State</th><th>PDF</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id}><td>{r.notice_no}{r.revision ? ` (revision ${r.revision})` : ""}</td><td>{r.notice_date}</td><td>{r.effective_date}</td><td className="r">{r.five}</td><td><StateBadge state={r.state} /></td><td>{r.pdf_url ? <a href={r.pdf_url}>Open</a> : "–"}</td></tr>)}</tbody>
    </table></div></>);
}
