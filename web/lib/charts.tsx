import { fmt, compact } from "./ui";
const short = (v: number) => (Math.abs(v) >= 10000 ? `${v < 0 ? "-" : ""}${compact(Math.abs(v))}` : fmt(v, 2));

export function LineChart({ points, height = 150 }: { points: { x: string; y: number }[]; height?: number }) {
  const W = 640, H = height, P = { l: 8, r: 8, t: 14, b: 22 };
  if (points.length < 2) return null;
  const ys = points.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const x = (i: number) => P.l + (i / (points.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join("");
  const last = points[points.length - 1];
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Closing price from ${points[0].x} to ${last.x}`}>
      <path d={`${d}L${x(points.length - 1)},${H - P.b}L${x(0)},${H - P.b}Z`} fill="var(--chart-soft)" opacity=".55" />
      <path d={d} fill="none" stroke="var(--chart)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(last.y)} r="3.5" fill="var(--chart)" />
      <text x={P.l} y={H - 6}>{points[0].x}</text>
      <text x={W - P.r} y={H - 6} textAnchor="end">{last.x}</text>
      <text x={W - P.r} y={10} textAnchor="end">{fmt(hi)}</text>
    </svg>
  );
}

/** Vertical bars by label (e.g. year), negatives drawn below the zero line in red. */
export function Bars({ data, label, unit = "" }: { data: { label: string; value: number }[]; label: string; unit?: string }) {
  if (!data.length) return null;
  const W = 320, H = 150, P = { t: 18, b: 22 };
  const max = Math.max(0, ...data.map((d) => d.value)), min = Math.min(0, ...data.map((d) => d.value));
  const span = max - min || 1;
  const zero = P.t + (max / span) * (H - P.t - P.b);
  const bw = (W / data.length) * 0.56;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${fmt(d.value)}`).join(", ")}`}>
      <line x1="0" x2={W} y1={zero} y2={zero} stroke="var(--rule)" />
      {data.map((d, i) => {
        const cx = (i + 0.5) * (W / data.length);
        const h = (Math.abs(d.value) / span) * (H - P.t - P.b);
        const yy = d.value >= 0 ? zero - h : zero;
        return (
          <g key={d.label}>
            <rect x={cx - bw / 2} y={yy} width={bw} height={Math.max(h, 1.5)} rx="2" fill={d.value >= 0 ? "var(--chart)" : "var(--alert)"} />
            <text x={cx} y={d.value >= 0 ? yy - 4 : yy + h + 11} textAnchor="middle">{short(d.value)}{unit}</text>
            <text x={cx} y={H - 5} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** A ratio against its PSX limit. kind "max": must stay below; "min": must be at least. */
export function Gauge({ title, value, limit, kind, unit = "%", scaleMax }: { title: string; value: number | null; limit: number; kind: "max" | "min"; unit?: string; scaleMax: number }) {
  const ok = value === null ? null : kind === "max" ? value < limit : value >= limit;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / scaleMax) * 100))}%`;
  return (
    <div className="gauge">
      <div className="row">
        <span>{title}</span>
        <span><b className={ok === null ? "" : ok ? "pos" : "neg"}>{fmt(value, 2, unit)}</b> <small>limit {kind === "max" ? "under" : "at least"} {limit}{unit}</small></span>
      </div>
      <div className="track" role="img" aria-label={`${title}: ${fmt(value, 2, unit)}, limit ${limit}${unit}`}>
        <div className="fill" style={{ width: value === null ? "0" : pct(value), background: ok === false ? "var(--alert)" : undefined }} />
        <div className="limit" style={{ left: pct(limit) }} />
      </div>
    </div>
  );
}
