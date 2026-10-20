import Link from "next/link";
import NameText from "@/components/log/NameText";
import { formatInt, formatSiegeDate } from "@/lib/format";
import type { SavedSiege } from "@/lib/summary";

export default function SiegeList({
  sieges,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyBody,
  skeletons = 6,
}: {
  sieges: SavedSiege[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  emptyTitle: string;
  emptyBody: string;
  skeletons?: number;
}) {
  if (loading) {
    return (
      <div className="loglist" aria-busy="true" aria-label="Loading sieges">
        {Array.from({ length: skeletons }, (_, index) => (
          <div key={index} className="sk" style={{ height: 50 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="card empty">
        <div className="ic">⚠</div>
        <h3>Couldn’t load sieges</h3>
        <p>The saved list didn’t come back. Nothing was deleted.</p>
        <button type="button" className="btn" onClick={onRetry}>Try again</button>
      </div>
    );
  }

  if (sieges.length === 0) {
    return (
      <div className="card empty">
        <div className="ic">🏰</div>
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
        <Link className="btn pri" href="/?upload=1">↑ Upload a log</Link>
      </div>
    );
  }

  return (
    <div className="loglist">
      {sieges.map((siege, index) => (
        <Link
          key={siege.id}
          className="li rise"
          href={`/logs/${siege.id}`}
          style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
        >
          <span className="dte">{formatSiegeDate(siege.logDate)}</span>
          <span>
            <b className={index === 0 ? "g" : undefined}>👑 {siege.winner || "Saved siege"}</b>{" "}
            <span className="mut num">{formatInt(siege.winnerPoints)} pts</span>
          </span>
          <span className="h-m">
            MVP {siege.mvp ? <NameText name={siege.mvp} /> : "—"}
            {siege.mvpGuild ? <span className="mut"> · {siege.mvpGuild}</span> : null}
          </span>
          <span className="mut num h-m">{formatInt(siege.kills)} kills</span>
          <span className="h-m" aria-hidden>›</span>
        </Link>
      ))}
    </div>
  );
}
