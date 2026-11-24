export const fmt = (v: any, d = 2, suffix = "") => v === null || v === undefined ? "–" : `${Number(v).toLocaleString("en-US", { maximumFractionDigits: d })}${suffix}`;
export function StateBadge({ state }: { state: string }) {
  return <span className={`badge ${state === "final" ? "" : "prov"}`}>{state[0].toUpperCase() + state.slice(1).replace("_", " ")}</span>;
}
export const stars = (r: string | null) => (r && /^[1-5]$/.test(r) ? "★".repeat(Number(r)) : r ?? "–");
