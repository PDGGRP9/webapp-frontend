import { useState, type KeyboardEvent, type PointerEvent } from "react";

export interface BarChartPoint {
  x: string;
  y: number;
}

interface BarChartProps {
  /** Fixed-length series (e.g. 24 hourly buckets, or 7 daily buckets), oldest first. */
  data: BarChartPoint[];
  ariaLabel: string;
  emptyMessage: string;
  valueSuffix?: string;
  /** Short label under each bar's tick (a subset of bars gets one, spaced out for readability). */
  formatAxisLabel: (iso: string) => string;
  /** Full label shown in the tooltip for the active bar. */
  formatTooltipLabel: (iso: string) => string;
}

const WIDTH = 900;
const HEIGHT = 360;
const MARGIN = { top: 24, right: 16, bottom: 40, left: 56 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

function niceTicks(max: number, count: number): number[] {
  if (max <= 0) return [0];
  const rawStep = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

export function BarChart({
  data,
  ariaLabel,
  emptyMessage,
  valueSuffix = "",
  formatAxisLabel,
  formatTooltipLabel,
}: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) {
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

  const maxValue = Math.max(...data.map((point) => point.y), 0);
  const yMax = maxValue > 0 ? maxValue * 1.15 : 10;
  const baseline = MARGIN.top + PLOT_HEIGHT;
  const yScale = (value: number) => baseline - (value / yMax) * PLOT_HEIGHT;

  const slotWidth = PLOT_WIDTH / data.length;
  const barWidth = Math.max(4, slotWidth * 0.55);
  const xForIndex = (index: number) => MARGIN.left + slotWidth * index + slotWidth / 2;

  const tickValues = niceTicks(yMax, 4);
  // Never more than ~8 axis labels, however many bars there are, so they don't crowd.
  const labelStride = Math.max(1, Math.ceil(data.length / 8));

  function nearestIndexForX(px: number): number {
    const raw = Math.floor((px - MARGIN.left) / slotWidth);
    return Math.min(data.length - 1, Math.max(0, raw));
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
      setActiveIndex((current) => Math.min(data.length - 1, (current ?? -1) + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, (current ?? data.length) - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(data.length - 1);
    } else if (event.key === "Escape") {
      setActiveIndex(null);
    }
  }

  const active = activeIndex !== null ? data[activeIndex] : null;
  const activeX = activeIndex !== null ? xForIndex(activeIndex) : 0;
  const tooltipWidth = 150;
  const tooltipX = active
    ? Math.min(Math.max(activeX - tooltipWidth / 2, MARGIN.left), WIDTH - MARGIN.right - tooltipWidth)
    : 0;

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="chart-svg"
        style={{ width: "100%", height: "auto" }}
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

        <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={baseline} y2={baseline} className="chart-axis" />

        {data.map((point, index) => {
          const x = MARGIN.left + slotWidth * index + (slotWidth - barWidth) / 2;
          const y = yScale(point.y);
          return (
            <rect
              key={point.x}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(0, baseline - y)}
              rx={3}
              className={index === activeIndex ? "chart-bar chart-bar-active" : "chart-bar"}
            />
          );
        })}

        {data.map((point, index) => {
          if (index % labelStride !== 0 && index !== data.length - 1) return null;
          return (
            <text key={point.x} x={xForIndex(index)} y={HEIGHT - 14} textAnchor="middle" className="chart-label">
              {formatAxisLabel(point.x)}
            </text>
          );
        })}

        {active && (
          <g>
            <line x1={activeX} x2={activeX} y1={MARGIN.top} y2={baseline} className="chart-crosshair" />
            <g transform={`translate(${tooltipX}, ${MARGIN.top})`}>
              <rect width={tooltipWidth} height={44} rx={10} className="chart-tooltip-bg" />
              <text x={12} y={18} className="chart-tooltip-value">
                {Math.round(active.y)}
                {valueSuffix}
              </text>
              <text x={12} y={34} className="chart-tooltip-date">
                {formatTooltipLabel(active.x)}
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
          onPointerDown={handlePointerMove}
        />
      </svg>
      <div className="visually-hidden" aria-live="polite">
        {active ? `${formatTooltipLabel(active.x)} : ${Math.round(active.y)}${valueSuffix}` : ""}
      </div>
    </div>
  );
}
