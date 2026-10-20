"use client";

import { useState } from "react";
import type { Timeline } from "@/lib/siege";

const WIDTH = 560;
const HEIGHT = 250;
const PAD = { l: 36, r: 12, t: 12, b: 22 };

export default function KillsChart({ timeline }: { timeline: Timeline }) {
  const [hover, setHover] = useState<number | null>(null);
  const minutes = Math.max(1, timeline.minutes);
  const peak = Math.max(1, ...timeline.series.flatMap((series) => series.values));
  const x = (minute: number) => PAD.l + (minute / minutes) * (WIDTH - PAD.l - PAD.r);
  const y = (value: number) => HEIGHT - PAD.b - (value / peak) * (HEIGHT - PAD.t - PAD.b);
  const grid = [];
  for (let value = 0; value <= peak; value += 50) {
    grid.push(value);
  }
  if (grid[grid.length - 1] !== peak && peak - grid[grid.length - 1] > 20) grid.push(peak);

  function minuteAt(clientX: number, bounds: DOMRect) {
    const local = ((clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = (local - PAD.l) / (WIDTH - PAD.l - PAD.r);
    return Math.max(0, Math.min(minutes, Math.round(ratio * minutes)));
  }

  return (
    <div className="card chart">
      <h2 className="sec">
        Kills over time
        <span className="chip">{timeline.startLabel} → +{timeline.minutes}m</span>
      </h2>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Cumulative kills per guild over time"
        onMouseMove={(event) => setHover(minuteAt(event.clientX, event.currentTarget.getBoundingClientRect()))}
        onMouseLeave={() => setHover(null)}
      >
        {grid.map((value) => (
          <g key={value}>
            <line x1={PAD.l} x2={WIDTH - PAD.r} y1={y(value)} y2={y(value)} stroke="#1f2738" />
            <text x={PAD.l - 6} y={y(value) + 4} fill="#6b7488" fontSize="10" textAnchor="end">{value}</text>
          </g>
        ))}
        {Array.from({ length: Math.floor(minutes / 10) + 1 }, (_, index) => index * 10).map((minute) => (
          <text key={minute} x={x(minute)} y={HEIGHT - 6} fill="#6b7488" fontSize="10" textAnchor="middle">{minute}m</text>
        ))}
        {timeline.series.map((series, index) => {
          const d = series.values.map((value, minute) => `${minute ? "L" : "M"}${x(minute).toFixed(1)},${y(value).toFixed(1)}`).join("");
          return (
            <path
              key={series.name}
              className="ln"
              d={d}
              stroke={series.color}
              pathLength={1}
              style={{ ["--len" as string]: 1, animationDelay: `${index * 60}ms`, opacity: index < 3 ? 1 : 0.55 }}
            />
          );
        })}
        {hover != null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={HEIGHT - PAD.b} stroke="#f5c451" strokeDasharray="3 3" />
            {timeline.series.map((series) => (
              <circle key={series.name} cx={x(hover)} cy={y(series.values[Math.min(hover, series.values.length - 1)] ?? 0)} r="3" fill={series.color} />
            ))}
          </g>
        ) : null}
      </svg>
      {hover != null ? (
        <div className="box" style={{ marginTop: 8 }}>
          <div className="sub2">+{hover}m</div>
          {timeline.series.map((series) => (
            <div key={series.name} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
              <span><i style={{ display: "inline-block", width: 10, height: 3, background: series.color, marginRight: 6 }} />{series.name}</span>
              <b className="num">{series.values[Math.min(hover, series.values.length - 1)] ?? 0}</b>
            </div>
          ))}
        </div>
      ) : null}
      <div className="leg">
        {timeline.series.map((series) => (
          <span key={series.name}><i style={{ background: series.color }} />{series.name}</span>
        ))}
      </div>
    </div>
  );
}
