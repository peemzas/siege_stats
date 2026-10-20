"use client";

import { useEffect, useRef } from "react";

export default function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const finalText = Math.round(value).toLocaleString("en-US");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      node.textContent = finalText;
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 900);
      const eased = 1 - (1 - progress) ** 3;
      node.textContent = Math.round(value * eased).toLocaleString("en-US");
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <b ref={ref} className="num">{Math.round(value).toLocaleString("en-US")}</b>;
}
