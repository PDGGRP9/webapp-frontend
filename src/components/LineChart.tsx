import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type UIEvent,
} from "react";
import { APP_TIME_ZONE, formatDate, nextZurichMidnightAfter } from "../lib/format";
import { splitByGap } from "../lib/measurements";

export interface LineChartPoint {
  x: string;
  y: number;
}

interface ProjectedPoint extends LineChartPoint {
  px: number;
  py: number;
}

interface LineChartProps {
  /** Dense raw series, sorted ascending by `x` (ISO timestamp). May contain time gaps. */
  data: LineChartPoint[];
  /** Smoothed average overlay (blue curve), sorted ascending. Optional. */
  averageData?: LineChartPoint[];
  /** Fixed chronological left/right edges of the axis (ISO). Data is placed on this timeline
   *  rather than on its own min/max, so silent periods render as real empty space. */
  domainStart: string;
  domainEnd: string;
  /** Break the raw line/area whenever two consecutive raw points are farther apart than this. */
  gapThresholdMs: number;
  /** Break the average line whenever two consecutive average points are farther apart than this.
   *  Defaults to `gapThresholdMs`. */
  averageGapThresholdMs?: number;
  valueSuffix?: string;
  ariaLabel: string;
  emptyMessage: string;
  /** Pin the y-axis floor instead of auto-padding below the lowest value (e.g. 0 for a step count). */
  minDomain?: number;
  /** Horizontal pixels per minute of the domain. Higher = more room per minute-level
   *  bucket, at the cost of a longer horizontally-scrollable canvas. */
  pxPerMinute?: number;
  /** Draw a dashed vertical marker (with date label) at each local midnight in the
   *  domain, to call out day changes. Use in place of averageData for a metric like
   *  step_count where a smoothed "average" doesn't make sense but day boundaries do. */
  showDayBoundaries?: boolean;
}

const EMPTY_WIDTH = 900;
const HEIGHT = 420;
const MARGIN = { top: 28, right: 28, bottom: 56, left: 64 };
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;
const MINUTE_MS = 60 * 1000;
const DEFAULT_PX_PER_MINUTE = 0.7;

/** "Mercredi 2 septembre 2026" in APP_TIME_ZONE — the scrolling date header above the chart. */
function formatDateHeader(ms: number): string {
  const text = new Date(ms).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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

/** Smooths a polyline into a continuous curve by quadratic-curving through each segment's midpoint. */
function smoothLinePath(points: ProjectedPoint[]): string {
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.px},${p.py}`).join(" ");
  }
  let d = `M${points[0].px},${points[0].py}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.px + next.px) / 2;
    const midY = (current.py + next.py) / 2;
    d += ` Q${current.px},${current.py} ${midX},${midY}`;
  }
  const lastPoint = points[points.length - 1];
  d += ` L${lastPoint.px},${lastPoint.py}`;
  return d;
}

export function LineChart({
  data,
  averageData = [],
  domainStart,
  domainEnd,
  gapThresholdMs,
  averageGapThresholdMs,
  valueSuffix = "",
  ariaLabel,
  emptyMessage,
  minDomain,
  pxPerMinute = DEFAULT_PX_PER_MINUTE,
  showDayBoundaries = false,
}: LineChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const domainStartMs = new Date(domainStart).getTime();
  const domainEndMs = new Date(domainEnd).getTime();
  // Date of the left-most visible instant — updated on scroll (and on mount, once the
  // chart auto-scrolls to "now"), shown above the chart so the x-axis can stay hour-only
  // (labels repeat every day over a 7-day span otherwise).
  const [viewStartMs, setViewStartMs] = useState(domainStartMs);

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const el = event.currentTarget;
    const scrollable = el.scrollWidth - el.clientWidth;
    const ratio = scrollable > 0 ? el.scrollLeft / scrollable : 0;
    setViewStartMs(domainStartMs + ratio * (domainEndMs - domainStartMs));
  }
  // The rendered pixel width is computed directly from the time span — never measured
  // from the DOM (no ResizeObserver race) and never a CSS percentage (those don't
  // reliably resolve inside an `overflow-x: auto` ancestor). viewBox and on-screen
  // width use the same number, so there's no aspect-ratio mismatch either.
  const totalMinutes = Math.max((domainEndMs - domainStartMs) / MINUTE_MS, 1);
  const plotWidth = totalMinutes * pxPerMinute;
  const width = MARGIN.left + plotWidth + MARGIN.right;

  const scales = useMemo(() => {
    if (data.length === 0 && averageData.length === 0) return null;
    const values = [...data, ...averageData].map((point) => point.y);
    const valueMin = Math.min(...values);
    const valueMax = Math.max(...values);
    const floor = minDomain ?? valueMin;
    const pad = Math.max((valueMax - floor) * 0.12, 1);
    const yMin = minDomain ?? floor - pad;
    const yMax = valueMax + pad;

    const xScale = (t: number) => MARGIN.left + ((t - domainStartMs) / (domainEndMs - domainStartMs)) * plotWidth;
    const yScale = (value: number) => MARGIN.top + PLOT_HEIGHT - ((value - yMin) / (yMax - yMin)) * PLOT_HEIGHT;

    return { yMin, yMax, xScale, yScale };
  }, [data, averageData, minDomain, domainStartMs, domainEndMs, plotWidth]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    const scrollable = el.scrollWidth - el.clientWidth;
    const ratio = scrollable > 0 ? el.scrollLeft / scrollable : 0;
    setViewStartMs(domainStartMs + ratio * (domainEndMs - domainStartMs));
    // width and data.length are the only inputs that change the scroll geometry; the domain
    // bounds drift forward by a few ms every render but the span (and so `width`) is fixed,
    // so keying off them would needlessly snap the scroll back to "now" on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, data.length]);

  if (!scales || (data.length === 0 && averageData.length === 0)) {
    return (
      <div className="chart-empty">
        <svg viewBox={`0 0 ${EMPTY_WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel}>
          <text x={EMPTY_WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className="chart-label">
            {emptyMessage}
          </text>
        </svg>
      </div>
    );
  }

  const { xScale, yScale, yMin, yMax } = scales;
  const baseline = yScale(yMin);
  const spanMs = domainEndMs - domainStartMs;
  // Hour-only labels, whatever the span: the day is carried by the scrolling date header above.
  const formatXLabel = (iso: string) =>
    new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });

  const project = (point: LineChartPoint): ProjectedPoint => ({
    ...point,
    px: xScale(new Date(point.x).getTime()),
    py: yScale(point.y),
  });
  const rawSegments = splitByGap(data, gapThresholdMs).map((segment) => segment.map(project));
  const avgSegments = splitByGap(averageData, averageGapThresholdMs ?? gapThresholdMs).map((segment) =>
    segment.map(project),
  );

  // Hovering/scrubbing reads off the raw per-minute series (not the smoothed average) so
  // the tooltip shows the actual bpm at that minute, not a coarser trend value.
  const hoverPoints = data.length > 0 ? data.map(project) : averageData.map(project);
  const active = activeIndex !== null ? hoverPoints[activeIndex] : null;

  function nearestIndexForX(px: number): number {
    let closest = 0;
    let closestDistance = Infinity;
    hoverPoints.forEach((point, index) => {
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
    const px = MARGIN.left + ratio * plotWidth;
    setActiveIndex(nearestIndexForX(px));
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(hoverPoints.length - 1, (current ?? -1) + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, (current ?? hoverPoints.length) - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(hoverPoints.length - 1);
    } else if (event.key === "Escape") {
      setActiveIndex(null);
    }
  }

  const last = hoverPoints[hoverPoints.length - 1];
  const tickValues = niceTicks(yMin, yMax, 5);
  // One label roughly every 160px so they never crowd, regardless of how wide the canvas is.
  const xLabelCount = Math.max(2, Math.floor(plotWidth / 160));

  const dayBoundaries: number[] = [];
  if (showDayBoundaries) {
    let t = nextZurichMidnightAfter(domainStartMs);
    while (t < domainEndMs) {
      dayBoundaries.push(t);
      t = nextZurichMidnightAfter(t); // day-by-day via calendar math, so DST days (23h/25h) don't drift
    }
  }

  const tooltipWidth = 150;
  const tooltipX = active ? Math.min(active.px + 12, width - MARGIN.right - tooltipWidth) : 0;

  return (
    <div className="chart-wrap">
      <div className="chart-date-header" aria-hidden="true">
        {formatDateHeader(viewStartMs)}
      </div>
      <div className="chart-scroll" ref={scrollRef} onScroll={handleScroll}>
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          className="chart-svg"
          style={{ width: `${width}px`, height: `${HEIGHT}px` }}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="chart-area-stop-top" />
              <stop offset="100%" className="chart-area-stop-bottom" />
            </linearGradient>
          </defs>

          {tickValues.map((tick) => {
            const y = yScale(tick);
            return (
              <g key={tick}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y} y2={y} className="chart-grid" />
                <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" className="chart-label">
                  {Math.round(tick)}
                </text>
                <text x={width - MARGIN.right + 10} y={y + 4} textAnchor="start" className="chart-label">
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          <line x1={MARGIN.left} x2={width - MARGIN.right} y1={baseline} y2={baseline} className="chart-axis" />

          {dayBoundaries.map((t) => {
            const x = xScale(t);
            return (
              <g key={t}>
                <line x1={x} x2={x} y1={MARGIN.top} y2={baseline} className="chart-day-boundary" />
                <text x={x} y={MARGIN.top - 10} textAnchor="middle" className="chart-label">
                  {new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: APP_TIME_ZONE })}
                </text>
              </g>
            );
          })}

          {Array.from({ length: xLabelCount + 1 }, (_, i) => {
            const t = domainStartMs + (i / xLabelCount) * spanMs;
            return (
              <text key={i} x={xScale(t)} y={HEIGHT - 22} textAnchor="middle" className="chart-label">
                {formatXLabel(new Date(t).toISOString())}
              </text>
            );
          })}

          {rawSegments.map((segment, segIndex) =>
            segment.length > 1 ? (
              <g key={segIndex}>
                <path
                  d={`${smoothLinePath(segment)} L${segment[segment.length - 1].px},${baseline} L${segment[0].px},${baseline} Z`}
                  fill={`url(#${gradientId})`}
                  className="chart-area"
                />
                <path d={smoothLinePath(segment)} className="chart-path-raw" />
              </g>
            ) : (
              <circle key={segIndex} cx={segment[0].px} cy={segment[0].py} r={3} className="chart-point-raw" />
            ),
          )}

          {avgSegments.map((segment, segIndex) =>
            segment.length > 1 ? (
              <path key={segIndex} d={smoothLinePath(segment)} className="chart-path-avg" />
            ) : (
              <circle key={segIndex} cx={segment[0].px} cy={segment[0].py} r={4} className="chart-point-avg" />
            ),
          )}

          {last && (
            <text x={last.px} y={last.py - 14} textAnchor="end" className="chart-end-label">
              {Math.round(last.y)}
              {valueSuffix}
            </text>
          )}

          {active && (
            <g>
              <line x1={active.px} x2={active.px} y1={MARGIN.top} y2={baseline} className="chart-crosshair" />
              <circle cx={active.px} cy={active.py} r={6} className="chart-point-active" />
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
            width={plotWidth}
            height={PLOT_HEIGHT}
            fill="transparent"
            onPointerMove={handlePointerMove}
          />
        </svg>
      </div>
      <div className="visually-hidden" aria-live="polite">
        {active ? `${formatDate(active.x)} : ${Math.round(active.y)}${valueSuffix}` : ""}
      </div>
    </div>
  );
}
