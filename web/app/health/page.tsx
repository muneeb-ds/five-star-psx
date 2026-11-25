import { q } from "@/lib/db";
export const revalidate = 60;
export const metadata = { title: "Data health" };
export default async function Health() {
  const runs = (await q("SELECT * FROM job_runs ORDER BY id DESC LIMIT 20")) as any[];
  const last = runs.find((r) => r.ok);
  return (<><h1>Data health</h1>
    <p className="lede">{last ? `Market data last updated successfully at ${last.started_at.replace("T", " ").replace("+00:00", " UTC")}.` : "The market job has not run successfully yet."} It runs every weekday after the PSX close.</p>
    {runs.length > 0 && <div className="tablewrap"><table><thead><tr><th>Job</th><th>Started (UTC)</th><th>Result</th><th>Details</th></tr></thead>
      <tbody>{runs.map((r) => <tr key={r.id}><td>{r.job}</td><td>{r.started_at}</td><td><span className={`pill ${r.ok ? "pass" : "alert"}`}>{r.ok ? "Succeeded" : "Problems"}</span></td><td style={{ whiteSpace: "normal" }}>{r.message}</td></tr>)}</tbody></table></div>}
    <h2>Where the data comes from</h2>
    <ul className="plain"><li>Star ratings and Shariah ratios: PSX recomposition notices, read from the PDF.</li><li>Prices, market cap, P/E, financials and announcements: the PSX data portal, delayed.</li><li>Dividend amounts: <code>manual/dividends.csv</code> in the project repository.</li></ul></>);
}
