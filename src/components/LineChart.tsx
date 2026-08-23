import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatDate } from "../lib/format";

export interface LineChartPoint {
  x: string;
  y: number;
}

interface LineChartProps {
  /** Must already be sorted ascending by `x` (ISO timestamp) — oldest first. */
  data: LineChartPoint[];
  valueSuffix?: string;
  ariaLabel: string;
  emptyMessage: string;
  /** Pin the y-axis floor instead of auto-padding below the lowest value (e.g. 0 for a step count). */
  minDomain?: number;
}

const WIDTH = 900;
const HEIGHT = 420;
const MARGIN = { top: 28, right: 28, bottom: 56, left: 64 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min];
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

export function LineChart({ data, valueSuffix = "", ariaLabel, emptyMessage, minDomain }: LineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const scales = useMemo(() => {
    if (data.length === 0) return null;
    const timestamps = data.map((point) => new Date(point.x).getTime());
    const values = data.map((point) => point.y);
    const xMin = Math.min(...timestamps);
    const xMax = Math.max(...timestamps);
    const valueMin = Math.min(...values);
    const valueMax = Math.max(...values);
    const floor = minDomain ?? valueMin;
    const pad = Math.max((valueMax - floor) * 0.12, 1);
    const yMin = minDomain ?? floor - pad;
    const yMax = valueMax + pad;

    const xScale = (t: number) =>
      MARGIN.left + (xMax === xMin ? PLOT_WIDTH / 2 : ((t - xMin) / (xMax - xMin)) * PLOT_WIDTH);
    const yScale = (value: number) => MARGIN.top + PLOT_HEIGHT - ((value - yMin) / (yMax - yMin)) * PLOT_HEIGHT;

    return { timestamps, xMin, xMax, yMin, yMax, xScale, yScale };
  }, [data, minDomain]);

  if (!scales || data.length === 0) {
    return (
      <div className="chart-empty">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel}>
          <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className="chart-label">
            {emptyMessage}
          </text>
        </svg>
      </div>
    );
  }

  const { timestamps, xMin, xMax, xScale, yScale, yMin, yMax } = scales;
  const spanMs = xMax - xMin;
  const formatXLabel = (iso: string) =>
    spanMs <= 2 * 24 * 60 * 60 * 1000
      ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const points = data.map((point, index) => ({
    ...point,
    px: xScale(timestamps[index]),
    py: yScale(point.y),
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.px},${point.py}`).join(" ");
  const dotRadius = points.length > 40 ? 2.5 : 4.5;
  const active = activeIndex !== null ? points[activeIndex] : null;

  function nearestIndexForX(px: number): number {
    let closest = 0;
    let closestDistance = Infinity;
    points.forEach((point, index) => {
      const distance = Math.abs(point.px - px);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = index;
      }
    });
    return closest;
  }

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const px = MARGIN.left + ratio * PLOT_WIDTH;
    setActiveIndex(nearestIndexForX(px));
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(points.length - 1, (current ?? -1) + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, (current ?? points.length) - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(points.length - 1);
    } else if (event.key === "Escape") {
      setActiveIndex(null);
    }
  }

  const last = points[points.length - 1];
  const tickValues = niceTicks(yMin, yMax, 5);
  const xLabelCount = Math.min(points.length, 6);

  // Flip the tooltip to the left of the crosshair once it would overflow the right edge.
  const tooltipWidth = 150;
  const tooltipX = active
    ? Math.min(Math.max(active.px + 12, MARGIN.left), WIDTH - MARGIN.right - tooltipWidth)
    : 0;

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="chart-svg"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerLeave={() => setActiveIndex(null)}
      >
        {tickValues.map((tick) => {
          const y = yScale(tick);
          return (
            <g key={tick}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} className="chart-grid" />
              <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" className="chart-label">
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={MARGIN.left}
          x2={WIDTH - MARGIN.right}
          y1={HEIGHT - MARGIN.bottom}
          y2={HEIGHT - MARGIN.bottom}
          className="chart-axis"
        />

        {Array.from({ length: xLabelCount }, (_, i) => {
          const index = Math.round((points.length - 1) * (xLabelCount === 1 ? 0 : i / (xLabelCount - 1)));
          const point = points[index];
          return (
            <text
              key={index}
              x={point.px}
              y={HEIGHT - 22}
              textAnchor="middle"
              className="chart-label"
            >
              {formatXLabel(point.x)}
            </text>
          );
        })}

        <path d={path} className="chart-path" />

        {points.map((point, index) => (
          <circle
            key={point.x}
            cx={point.px}
            cy={point.py}
            r={index === points.length - 1 ? 5.5 : dotRadius}
            className="chart-point"
          />
        ))}

        <text x={last.px} y={last.py - 14} textAnchor="end" className="chart-end-label">
          {Math.round(last.y)}
          {valueSuffix}
        </text>

        {active && (
          <g>
            <line
              x1={active.px}
              x2={active.px}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
              className="chart-crosshair"
            />
            <circle cx={active.px} cy={active.py} r={6} className="chart-point chart-point-active" />
            <g transform={`translate(${tooltipX}, ${MARGIN.top})`}>
              <rect width={tooltipWidth} height={44} rx={10} className="chart-tooltip-bg" />
              <text x={12} y={18} className="chart-tooltip-value">
                {Math.round(active.y)}
                {valueSuffix}
              </text>
              <text x={12} y={34} className="chart-tooltip-date">
                {formatDate(active.x)}
              </text>
            </g>
          </g>
        )}

        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={PLOT_WIDTH}
          height={PLOT_HEIGHT}
          fill="transparent"
          onPointerMove={handlePointerMove}
        />
      </svg>
      <div className="visually-hidden" aria-live="polite">
        {active ? `${formatDate(active.x)} : ${Math.round(active.y)}${valueSuffix}` : ""}
      </div>
    </div>
  );
}
