import { useEffect, useRef, useState } from 'react';
import './Chart.css';

const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 48 };

// Paso "redondo" (1, 2, 5 × 10^n, mínimo 1) para 4 divisiones: marcas enteras y sin repetir.
function niceStep(max) {
  const raw = max / 4;
  if (raw <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * pow).find((m) => m >= raw);
}

// Gráfico de una sola serie (sin leyenda: el título la nombra). variant: 'line' | 'bar'.
// data: [{ label, value }]; format da el texto del tooltip y del eje.
export default function Chart({ data, variant = 'line', format = String, title }) {
  const [active, setActive] = useState(null);
  // Se dibuja al ancho real del contenedor para que el texto no se escale con el SVG.
  const ref = useRef(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    if (!window.ResizeObserver) return undefined;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, entry.contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const max = niceStep(Math.max(...data.map((d) => d.value))) * 4;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = plotW / data.length;
  const x = (i) => PAD.left + step * i + step / 2;
  const y = (v) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const barW = Math.min(44, step * 0.55);
  const linePath = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');
  const areaPath = `${linePath} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  return (
    <div className="c-chart" ref={ref} onMouseLeave={() => setActive(null)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="c-chart__svg" role="img" aria-label={title}>
        <defs>
          <linearGradient id="c-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--chart-series)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--chart-series)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line className="c-chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="c-chart__tick" x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">{format(t, true)}</text>
          </g>
        ))}

        {data.map((d, i) => (
          <text key={d.label} className="c-chart__tick" x={x(i)} y={H - 8} textAnchor="middle">{d.label}</text>
        ))}

        {variant === 'bar' && data.map((d, i) => {
          const h = Math.max(y(0) - y(d.value), d.value ? 4 : 0);
          // Barra con esquinas superiores redondeadas (4px) y base recta sobre el eje.
          const r = Math.min(4, h);
          const left = x(i) - barW / 2;
          const top = y(0) - h;
          return (
            <path
              key={d.label}
              className={`c-chart__bar ${active === i ? 'is-active' : ''}`}
              d={`M${left},${y(0)} V${top + r} Q${left},${top} ${left + r},${top} H${left + barW - r} Q${left + barW},${top} ${left + barW},${top + r} V${y(0)} Z`}
            />
          );
        })}

        {variant === 'line' && (
          <>
            <path d={areaPath} fill="url(#c-chart-fill)" />
            <path d={linePath} className="c-chart__line" />
            {data.map((d, i) => (
              <circle key={d.label} className={`c-chart__dot ${active === i ? 'is-active' : ''}`} cx={x(i)} cy={y(d.value)} r={active === i ? 6 : 4} />
            ))}
            {active !== null && <line className="c-chart__cross" x1={x(active)} x2={x(active)} y1={PAD.top} y2={y(0)} />}
          </>
        )}

        {/* Zonas de hover más grandes que la marca. */}
        {data.map((d, i) => (
          <rect key={d.label} x={PAD.left + step * i} y={PAD.top} width={step} height={plotH} fill="transparent" onMouseEnter={() => setActive(i)} />
        ))}
      </svg>

      {active !== null && (
        <div
          className="c-chart__tooltip"
          style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(data[active].value) / H) * 100}%` }}
        >
          <span className="c-chart__tooltip-label">{data[active].label}</span>
          <strong>{format(data[active].value)}</strong>
        </div>
      )}

      <table className="u-sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{format(d.value)}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}
