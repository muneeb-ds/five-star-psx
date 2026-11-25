import Link from "next/link";
import { q } from "@/lib/db";
import { StateBadge, stars } from "@/lib/ui";
export const revalidate = 300;
export const metadata = { title: "What changed" };

export default async function Changes() {
  const reviews = (await q("SELECT * FROM reviews ORDER BY effective_date DESC, revision DESC")) as any[];
  const all = (await q("SELECT ch.*, c.name FROM changes ch JOIN companies c ON c.ticker=ch.ticker WHERE ch.superseded_by IS NULL ORDER BY ch.ticker")) as any[];
  return (
    <>
      <h1>What changed</h1>
      <p className="lede">Each PSX review is compared with the one before it. A company that falls below five stars counts as non-compliant here, and the card shows its new PSX status.</p>
      {reviews.map((r) => {
        const ch = all.filter((c) => c.review_id === r.id);
        const of = (k: string) => ch.filter((c) => c.kind === k);
        const stayed = ch.filter((c) => c.kind === "stayed" || c.kind === "baseline");
        const dropped = of("dropped"), added = [...of("new"), ...of("returned")];
        return (
          <section className="review" key={r.id}>
            <h3>{r.notice_no}</h3>
            <div className="meta"><span>Effective {r.effective_date}</span><StateBadge state={r.state} />{r.pdf_url && <a href={r.pdf_url}>PSX notice</a>}</div>
            {r.is_baseline ? (
              <p>First review with star ratings. {stayed.length} companies start the list, so nothing counts as new or dropped.</p>
            ) : (
              <>
                <p>{dropped.length} dropped, {added.length} joined, {stayed.length} stayed.</p>
                {dropped.length > 0 && <><b className="neg">Dropped</b><div className="chips">{dropped.map((c) => {
                  const d = c.detail ? JSON.parse(c.detail) : null;
                  return <Link key={c.ticker} href={`/company/${c.ticker}`} className="chip drop" title={c.name}>{c.ticker}: now {stars(c.new_status)}{d ? ` (${d.shariah_status})` : ""}</Link>; })}</div></>}
                {added.length > 0 && <><b className="pos">Joined</b><div className="chips">{added.map((c) => <Link key={c.ticker} href={`/company/${c.ticker}`} className="chip new" title={c.name}>{c.ticker}{c.kind === "returned" ? " (returned)" : ""}</Link>)}</div></>}
              </>
            )}
            <details><summary className="mut" style={{ cursor: "pointer" }}>{r.is_baseline ? "Show the" : "Show the companies that stayed:"} {stayed.length} {r.is_baseline ? "companies" : ""}</summary>
              <div className="chips">{stayed.map((c) => <Link key={c.ticker} href={`/company/${c.ticker}`} className="chip" title={c.name}>{c.ticker}</Link>)}</div></details>
          </section>
        );
      })}
    </>
  );
}
