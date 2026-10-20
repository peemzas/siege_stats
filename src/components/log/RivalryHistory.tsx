import Link from "next/link";
import { formatSiegeDay } from "@/lib/format";
import type { RivalPoint } from "@/lib/aggregate";

export default function RivalryHistory({
  guild,
  opponent,
  series,
  loading = false,
}: {
  guild: string;
  opponent: string;
  series: RivalPoint[];
  loading?: boolean;
}) {
  return (
    <section className="card" style={{ marginTop: 16 }} aria-label={`${guild} kills on ${opponent}`}>
      <h2 className="sec">
        <span>{guild} on {opponent}</span>
        <span className="chip">{series.length ? `last ${series.length}` : "no shared sieges"}</span>
      </h2>
      {loading ? <div className="sk" style={{ height: 140 }} /> : null}
      {!loading && series.length === 0 ? <p className="mut">These guilds have not been in the same saved siege.</p> : null}
      {!loading && series.length > 0 ? (
        <div className="rhist">
          {series.map((point, index) => {
            const max = Math.max(1, ...series.map((item) => item.kills));
            const height = point.kills === 0 ? 4 : Math.max(8, (point.kills / max) * 100);
            return (
              <Link key={point.logId} href={`/logs/${point.logId}`} className="col" title={`${formatSiegeDay(point.date)} · ${point.kills}`}>
                <span className="num">{point.kills}</span>
                <i style={{ height: `${height}%`, animationDelay: `${index * 40}ms` }} />
                <span className="dte">{formatSiegeDay(point.date)}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
