import { q } from "@/lib/db";
export const revalidate = 60;
export default async function Health() {
  const runs = await q("SELECT * FROM job_runs ORDER BY id DESC LIMIT 20");
  return (<><h1>Sources &amp; health</h1>
    {runs.length ? <div className="table"><table><thead><tr><th>Job</th><th>Started</th><th>OK</th><th>Message</th></tr></thead>
      <tbody>{runs.map((r: any) => <tr key={r.id}><td>{r.job}</td><td>{r.started_at}</td><td>{r.ok ? "yes" : "no"}</td><td>{r.message}</td></tr>)}</tbody></table></div>
      : <p className="mut">No scheduled job has run yet.</p>}
    <p className="mut">Uploading a PSX PDF is done by running <code>python jobs/ingest.py file.pdf</code> or the “Ingest PSX notice” GitHub Action.</p></>);
}
