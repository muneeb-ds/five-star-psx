"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { compact, fmt, signed, cls, titleCase, SECTOR_COLORS } from "@/lib/ui";

export type Row = {
  ticker: string; name: string; sector: string | null; kind: string;
  price: number | null; chg: number | null; mcap: number | null; pe: number | null; dy: number | null; since: string | null;
};
type Key = "ticker" | "name" | "sector" | "price" | "chg" | "mcap" | "pe" | "dy";
const COLS: { key: Key; label: string; right?: boolean; sm?: boolean }[] = [
  { key: "ticker", label: "Ticker" }, { key: "name", label: "Company" }, { key: "sector", label: "Sector", sm: true },
  { key: "price", label: "Price (Rs)", right: true }, { key: "chg", label: "Day", right: true },
  { key: "mcap", label: "Market cap", right: true, sm: true }, { key: "pe", label: "P/E", right: true, sm: true }, { key: "dy", label: "Dividend yield", right: true, sm: true },
];

export default function Explorer({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "mcap", dir: -1 });

  const sectors = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.sector ?? "Other", (m.get(r.sector ?? "Other") ?? 0) + (r.mcap ?? 0)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [rows]);
  const color = (s: string | null) => SECTOR_COLORS[sectors.indexOf(s ?? "Other") % SECTOR_COLORS.length];

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (!sector || (r.sector ?? "Other") === sector) && (!needle || r.ticker.toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle)))
      .sort((a, b) => {
        const x: any = a[sort.key], y: any = b[sort.key];
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        return (typeof x === "string" ? x.localeCompare(y) : x - y) * sort.dir;
      });
  }, [rows, q, sector, sort]);

  const stripRows = [...rows].sort((a, b) => (b.mcap ?? 0) - (a.mcap ?? 0));
  const floor = Math.max(...stripRows.map((r) => r.mcap ?? 0), 1) * 0.035; // keep tiny caps visible

  return (
    <>
      <div className="strip" role="list" aria-label="Companies sized by market cap, coloured by sector">
        {stripRows.map((r) => (
          <Link key={r.ticker} role="listitem" href={`/company/${r.ticker}`} title={`${r.name} (${titleCase(r.sector) ?? "Other"}), market cap ${compact(r.mcap)}`}
            className={sector && (r.sector ?? "Other") !== sector ? "off" : ""}
            style={{ flexGrow: Math.max(r.mcap ?? 0, floor), background: color(r.sector) }}>
            {r.ticker}
          </Link>
        ))}
      </div>
      <div className="legend">
        {sectors.map((s) => (
          <button key={s} aria-pressed={sector === s} onClick={() => setSector(sector === s ? null : s)}>
            <i style={{ background: color(s) }} />{titleCase(s)}
          </button>
        ))}
      </div>

      <div className="controls">
        <input type="search" placeholder="Search ticker or company" aria-label="Search companies" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="count" aria-live="polite">{shown.length} of {rows.length} companies</span>
      </div>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className={`${c.right ? "r" : ""} ${c.sm ? "hide-sm" : ""}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button onClick={() => setSort({ key: c.key, dir: sort.key === c.key ? ((sort.dir * -1) as 1 | -1) : c.right ? -1 : 1 })}>
                    {c.label}{sort.key === c.key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.ticker} className="link" onClick={() => router.push(`/company/${r.ticker}`)}>
                <td><Link href={`/company/${r.ticker}`} onClick={(e) => e.stopPropagation()}>{r.ticker}</Link></td>
                <td className="name">{r.name}{r.kind === "new" || r.kind === "returned" ? <> <span className="pill pass">{r.kind === "new" ? "New" : "Returned"}</span></> : null}</td>
                <td className="hide-sm"><i className="dot" style={{ background: color(r.sector) }} />{titleCase(r.sector) ?? "–"}</td>
                <td className="r">{fmt(r.price)}</td>
                <td className={`r ${cls(r.chg)}`}>{signed(r.chg)}</td>
                <td className="r hide-sm">{compact(r.mcap)}</td>
                <td className="r hide-sm">{r.pe === null || r.pe === 0 ? "–" : fmt(r.pe, 1)}</td>
                <td className="r hide-sm">{r.dy ? fmt(r.dy, 2, "%") : "–"}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={8} className="mut">No company matches. Clear the search or pick another sector.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
