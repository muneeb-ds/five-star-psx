import { q } from "@/lib/db";
import { StateBadge } from "@/lib/ui";
export const revalidate = 300;
export default async function Reviews() {
  const rows = await q(`SELECT r.*, (SELECT COUNT(*) FROM changes c WHERE c.review_id=r.id AND c.kind!='dropped') AS five FROM reviews r ORDER BY effective_date DESC`);
  return (<><h1>Reviews archive</h1><div className="table"><table>
    <thead><tr><th>Notice</th><th>Date</th><th>Effective</th><th>Five-star</th><th>State</th><th>PDF</th></tr></thead>
    <tbody>{rows.map((r: any) => <tr key={r.id}><td>{r.notice_no}{r.revision ? ` (rev ${r.revision})` : ""}</td><td>{r.notice_date}</td><td>{r.effective_date}</td><td>{r.five}</td><td><StateBadge state={r.state} /></td><td>{r.pdf_url ? <a href={r.pdf_url}>PDF</a> : "–"}</td></tr>)}</tbody>
  </table></div></>);
}
