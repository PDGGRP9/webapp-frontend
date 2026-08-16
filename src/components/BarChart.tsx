import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatDate } from "../lib/format";

export interface BarChartPoint {
  x: string;
  y: number;
}

interface BarChartProps {
  /** Must already be sorted ascending by `x` (ISO timestamp) — oldest first. */
  data: BarChartPoint[];
  valueSuffix?: string;
  ariaLabel: string;
  emptyMessage: string;
}

const WIDTH = 900;
const HEIGHT = 420;
const MARGIN = { top: 28, right: 28, bottom: 56, left: 64 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const BAR_GAP_RATIO = 0.32;

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

export function BarChart({ data, valueSuffix = "", ariaLabel, emptyMessage }: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const scales = useMemo(() => {
    if (data.length === 0) return null;
    const values = data.map((point) => point.y);
    const valueMax = Math.max(...values, 0);
    const yMax = valueMax * 1.15 || 1;
    const yScale = (value: number) => MARGIN.top + PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;
    const slotWidth = PLOT_WIDTH / data.length;
    const barWidth = slotWidth * (1 - BAR_GAP_RATIO);
    return { yMax, yScale, slotWidth, barWidth };
  }, [data]);

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

  const { yMax, yScale, slotWidth, barWidth } = scales;
  const spanMs = data.length > 1 ? new Date(data[data.length - 1].x).getTime() - new Date(data[0].x).getTime() : 0;
  const formatXLabel = (iso: string) =>
    spanMs <= 2 * 24 * 60 * 60 * 1000
      ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
      : new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

  const bars = data.map((point, index) => ({
    ...point,
    bx: MARGIN.left + index * slotWidth + (slotWidth - barWidth) / 2,
    by: yScale(point.y),
  }));
  const maxIndex = bars.reduce((best, bar, index) => (bar.y > bars[best].y ? index : best), 0);
  const active = activeIndex !== null ? bars[activeIndex] : null;
  const tickValues = niceTicks(0, yMax, 5);
  const xLabelCount = Math.min(data.length, 6);

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.min(data.length - 1, Math.max(0, Math.floor(ratio * data.length)));
    setActiveIndex(index);
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(bars.length - 1, (current ?? -1) + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, (current ?? bars.length) - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(bars.length - 1);
    } else if (event.key === "Escape") {
      setActiveIndex(null);
    }
  }

  const tooltipWidth = 150;
  const tooltipX = active
    ? Math.min(Math.max(active.bx + barWidth / 2 + 12, MARGIN.left), WIDTH - MARGIN.right - tooltipWidth)
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
          const index = Math.round((data.length - 1) * (xLabelCount === 1 ? 0 : i / (xLabelCount - 1)));
          const bar = bars[index];
          return (
            <text
              key={index}
              x={bar.bx + barWidth / 2}
              y={HEIGHT - 22}
              textAnchor="middle"
              className="chart-label"
            >
              {formatXLabel(bar.x)}
            </text>
          );
        })}

        {bars.map((bar, index) => (
          <rect
            key={bar.x}
            x={bar.bx}
            y={bar.by}
            width={barWidth}
            height={HEIGHT - MARGIN.bottom - bar.by}
            rx={Math.min(6, barWidth / 2)}
            className={index === maxIndex ? "chart-bar chart-bar-max" : "chart-bar"}
          />
        ))}

        <text x={bars[maxIndex].bx + barWidth / 2} y={bars[maxIndex].by - 10} textAnchor="middle" className="chart-end-label">
          {Math.round(bars[maxIndex].y)}
          {valueSuffix}
        </text>

        {active && (
          <g>
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
