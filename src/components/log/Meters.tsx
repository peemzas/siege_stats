import type { Bar } from "@/lib/siege";
import { shortName } from "@/lib/names";

export default function Meters({ items, tone, compact = false, max }: { items: Bar[]; tone: "k" | "d" | "g"; compact?: boolean; max?: number }) {
  const scale = Math.max(1, max ?? Math.max(1, ...items.map((item) => item.count)));
  return (
    <>
      {items.map((item, index) => (
        <div className={`hb ${tone}`} key={`${item.label}-${index}`}>
          <span className="lb" title={item.label}>{compact ? shortName(item.label) : item.label}</span>
          <span className="tr">
            <i style={{ width: `${(Math.max(0, item.count) / scale) * 100}%`, transitionDelay: `${index * 40}ms` }} />
          </span>
          <span className="v num">{item.count}</span>
        </div>
      ))}
    </>
  );
}
