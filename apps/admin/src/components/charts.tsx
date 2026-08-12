'use client';

import { useMemo, useState } from 'react';

export interface TrendPoint {
  date: string;
  value: number;
}

interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}

const W = 720;
const PAD_X = 6;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

function useChart(data: TrendPoint[], height: number) {
  return useMemo(() => {
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const innerH = height - PAD_TOP - PAD_BOTTOM;

    const points = data.map((d, i) => {
      const x = data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - PAD_X * 2) + PAD_X;
      const y = PAD_TOP + (1 - (d.value - min) / span) * innerH;
      return { x, y, ...d };
    });

    return { points, max, min, innerH, areaPath: buildAreaPath(points, height) };
  }, [data, height]);
}

function buildAreaPath(points: { x: number; y: number }[], height: number) {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  d += ` L ${points[points.length - 1].x} ${height - PAD_BOTTOM}`;
  d += ` L ${points[0].x} ${height - PAD_BOTTOM} Z`;
  return d;
}

function NiceTicks(min: number, max: number, count = 4) {
  const ticks: number[] = [];
  const span = max - min || 1;
  for (let i = 0; i <= count; i++) {
    ticks.push(min + (span * i) / count);
  }
  return ticks;
}

export function TrendAreaChart({
  data,
  height = 160,
  color = '#cda434',
  formatValue,
}: TrendChartProps) {
  const { points, min, max, innerH, areaPath } = useChart(data, height);
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const ticks = NiceTicks(min, max);
  const [hover, setHover] = useState<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="h-auto w-full"
      role="img"
      onMouseLeave={() => { setHover(null); setHoverIdx(null); }}
    >
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {ticks.map((t, i) => {
        const y = PAD_TOP + (1 - (t - min) / (max - min || 1)) * innerH;
        return (
          <g key={i}>
            <line x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="var(--color-ink-100)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={PAD_X} y={y - 3} fontSize="9" fill="var(--color-ink-400)" fontFamily="var(--font-jetbrains)">
              {formatValue ? formatValue(t) : t.toFixed(0)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#area-fill)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={hoverIdx === i ? 5 : 0}
          fill={color}
          opacity={hoverIdx === i ? 1 : 0}
          className={hoverIdx === i ? 'chart-hover-dot' : undefined}
        />
      ))}

      {points.map((p, i) => (
        <rect
          key={`hit-${i}`}
          x={p.x - 14}
          y={0}
          width={28}
          height={height}
          fill="transparent"
          onMouseEnter={() => { setHoverIdx(i); setHover(p.value); }}
        />
      ))}

      {hover !== null && hoverIdx !== null && points[hoverIdx] && (
        <g pointerEvents="none">
          <rect
            x={Math.min(Math.max(points[hoverIdx].x - 34, 4), W - 76)}
            y={2}
            width={72}
            height={18}
            rx={4}
            fill="var(--color-ink-900)"
          />
          <text
            x={Math.min(Math.max(points[hoverIdx].x - 34, 4), W - 76) + 36}
            y={14}
            fontSize="10"
            fill="#fff"
            textAnchor="middle"
            fontFamily="var(--font-jetbrains)"
          >
            {formatValue ? formatValue(hover) : hover.toFixed(0)}
          </text>
        </g>
      )}
    </svg>
  );
}

export function TrendBarChart({
  data,
  height = 160,
  color = '#0a2e22',
  formatValue,
}: TrendChartProps) {
  const { points, max, innerH } = useChart(data, height);
  const barW = Math.max(2, (W - PAD_X * 2) / Math.max(points.length, 1) - 4);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="h-auto w-full"
      role="img"
      onMouseLeave={() => setHoverIdx(null)}
    >
      <line x1={PAD_X} x2={W - PAD_X} y1={height - PAD_BOTTOM} y2={height - PAD_BOTTOM} stroke="var(--color-ink-100)" />
      {points.map((p, i) => {
        const h = (p.value / (max || 1)) * innerH;
        const y = height - PAD_BOTTOM - h;
        const active = hoverIdx === i;
        return (
          <g key={i}>
            <rect
              x={p.x - barW / 2}
              y={y}
              width={barW}
              height={Math.max(h, 0)}
              rx={2}
              fill={active ? color : `${color}`}
              opacity={active ? 1 : 0.85}
              onMouseEnter={() => setHoverIdx(i)}
            />
            {active && (
              <text
                x={p.x}
                y={Math.max(y - 4, 8)}
                fontSize="10"
                textAnchor="middle"
                fill="var(--color-ink-700)"
                fontFamily="var(--font-jetbrains)"
              >
                {formatValue ? formatValue(p.value) : p.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
