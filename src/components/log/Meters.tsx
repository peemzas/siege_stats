"use client";

import { useEffect, useState } from "react";
import { shortName } from "@/lib/names";
import type { Bar } from "@/lib/siege";

export default function Meters({
  items,
  tone,
  compact = false,
  max,
  active = true,
  suffix = "",
}: {
  items: Bar[];
  tone: "k" | "d" | "g";
  compact?: boolean;
  max?: number;
  active?: boolean;
  suffix?: string;
}) {
  const scale = Math.max(1, max ?? Math.max(1, ...items.map((item) => item.count), 0));
  const signature = items.map((item) => `${item.label}:${item.count}`).join("|");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      return;
    }
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, [active, signature]);

  return (
    <>
      {items.map((item, index) => (
        <div className={`hb ${tone}${suffix ? " wide" : ""}`} key={`${item.label}-${index}`}>
          <span className="lb" title={item.label}>{compact ? shortName(item.label) : item.label}</span>
          <span className="tr">
            <i style={{ width: ready ? `${(Math.max(0, item.count) / scale) * 100}%` : 0, transitionDelay: `${index * 40}ms` }} />
          </span>
          <span className="v num">{item.count}{suffix}</span>
        </div>
      ))}
    </>
  );
}
