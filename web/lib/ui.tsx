export const fmt = (v: any, d = 2, suffix = "") =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "–" : `${Number(v).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 })}${suffix}`;
export const signed = (v: any, d = 2, suffix = "%") =>
  v === null || v === undefined ? "–" : `${Number(v) > 0 ? "+" : ""}${Number(v).toLocaleString("en-US", { maximumFractionDigits: d })}${suffix}`;
export const cls = (v: any) => (v === null || v === undefined || Number(v) === 0 ? "" : Number(v) > 0 ? "pos" : "neg");
export const stars = (r: string | null) => (r && /^[1-5]$/.test(r) ? "★".repeat(Number(r)) : r ?? "–");
export function compact(v: any) {
  if (v === null || v === undefined) return "–";
  const n = Number(v);
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toLocaleString("en-US");
}
export function StateBadge({ state }: { state: string }) {
  const label = { provisional: "Provisional", final: "Final", revised: "Revised", needs_check: "Needs check" }[state] ?? state;
  return <span className={`pill ${state === "final" ? "pass" : "warn"}`}>{label}</span>;
}
export const SECTOR_COLORS = ["var(--s0)", "var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)"];
export const titleCase = (s: string | null) =>
  s ? s.toLowerCase().replace(/(^|[\s&/(-])([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/\bReit\b/, "REIT") : s;
