"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CountUp from "./CountUp";
import Meters from "./Meters";
import NameText from "./NameText";
import { guildColor, kdRatio, type PlayerView } from "@/lib/siege";
import { formatSiegeDate } from "@/lib/format";

type Tab = "timeline" | "victims" | "killers" | "history";

type HistoryRow = { logId: string; date: string; guild: string; place: number; points: number; kills: number; deaths: number };

export default function PlayerSheet({
  player,
  index,
  total,
  server,
  date,
  guildIndex,
  focusLife,
  onClose,
  onPrev,
  onNext,
}: {
  player: PlayerView;
  index: number;
  total: number;
  server: string;
  date: string;
  guildIndex: number;
  focusLife?: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [tab, setTab] = useState<Tab>("timeline");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setHistory([]);
    fetch(`/api/players/${encodeURIComponent(player.name)}?server=${encodeURIComponent(server)}`, { signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload: { appearances?: HistoryRow[] } | null) => {
        if (controller.signal.aborted) return;
        const rows = payload?.appearances ?? [];
        setHistory(rows.length > 1 ? rows : []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHistory([]);
      });
    return () => controller.abort();
  }, [player.name, server]);

  useEffect(() => {
    setTab("timeline");
    const node = dialogRef.current;
    node?.focus();
    const life = node?.querySelector<HTMLElement>(`#life-${focusLife ?? 0}`);
    life?.scrollIntoView({ block: "nearest" });
  }, [player.name, focusLife]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previous;
    };
  }, [onClose, onPrev, onNext]);

  const maxLife = Math.max(1, ...player.lives.map((life) => life.kills.length));

  return (
    <div
      className="ovl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} timeline`}
        tabIndex={-1}
        ref={dialogRef}
        onPointerDown={(event) => {
          const handle = (event.target as HTMLElement).closest(".sheet-handle, .mh");
          if (!handle) return;
          drag.current = { y: event.clientY };
        }}
        onPointerUp={(event) => {
          if (!drag.current) return;
          const delta = event.clientY - drag.current.y;
          drag.current = null;
          if (delta > 90 && window.innerWidth <= 760) onClose();
        }}
      >
        <div className="sheet-handle" aria-hidden />
        <div className="mh">
          <div>
            <div className="mut" style={{ fontSize: 12 }}>
              #{index + 1} of {total} · {server} · {formatSiegeDate(date)}
            </div>
            <h2><NameText name={player.name} /></h2>
            <span style={{ color: guildColor(guildIndex), fontWeight: 700 }}>⬢ {player.guild}</span>
            <div>
              <Link className="btn" href={`/players/${encodeURIComponent(player.name)}?server=${encodeURIComponent(server)}`} style={{ marginTop: 8 }}>
                Profile
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn" onClick={onPrev} disabled={index === 0} aria-label="Previous player">←</button>
            <button type="button" className="btn" onClick={onNext} disabled={index >= total - 1} aria-label="Next player">→</button>
            <button type="button" className="btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <div className="mstats">
          <div><small>Points</small><CountUp value={player.points} /></div>
          <div><small>Kills</small><b className="num k">{player.kills}</b></div>
          <div><small>Deaths</small><b className="num d">{player.deaths}</b></div>
          <div><small>K/D</small><b className="num">{kdRatio(player.kills, player.deaths)}</b></div>
          <div><small>Best streak</small><b className="num g">{player.bestStreak}</b></div>
        </div>
        <div className="sub2">Kills per life ({player.lives.length} lives)</div>
        <div className="lifebar">
          {player.lives.map((life, lifeIndex) => (
            <i
              key={lifeIndex}
              className={life.kills.length ? undefined : "z"}
              title={`Life ${lifeIndex + 1}: ${life.kills.length} kills`}
              style={{ height: `${Math.max(8, (life.kills.length / maxLife) * 100)}%`, animationDelay: `${lifeIndex * 40}ms` }}
            />
          ))}
        </div>
        <div className="mtabs" role="tablist">
          {(["timeline", "victims", "killers"] as const).map((key) => (
            <span
              key={key}
              role="tab"
              className={tab === key ? "a" : undefined}
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              style={{ cursor: "pointer" }}
            >
              {key === "timeline" ? "Timeline" : key === "victims" ? "Victims" : "Killers"}
            </span>
          ))}
          {history.length > 1 ? (
            <span role="tab" className={tab === "history" ? "a" : undefined} aria-selected={tab === "history"} onClick={() => setTab("history")} style={{ cursor: "pointer" }}>
              History ({history.length})
            </span>
          ) : null}
        </div>
        {tab === "timeline" ? (
          <>
            <div className="grid2" style={{ gap: 10, marginBottom: 6 }}>
              <div className="box">
                <h3><span className="k">Kills by guild</span></h3>
                <Meters items={player.killsByGuild} tone="k" />
              </div>
              <div className="box">
                <h3><span className="d">Killed by</span></h3>
                <Meters items={player.killers} tone="d" compact />
              </div>
            </div>
            {player.lives.map((life, lifeIndex) => (
              <div className="life" id={`life-${lifeIndex}`} key={lifeIndex}>
                <h4>
                  Life {lifeIndex + 1} · <span className="k">{life.kills.length} kills</span>
                  {life.kills.length === player.bestStreak && player.bestStreak > 2 ? (
                    <span className="chip" style={{ borderColor: "#f5c45166", color: "var(--gold)" }}>⚡ best streak</span>
                  ) : null}
                </h4>
                {life.kills.map((kill, killIndex) => (
                  <div className="ev" key={`${kill.time}-${kill.player}-${killIndex}`}>
                    <time className="num">{kill.time}</time>
                    <span className="k">✕</span>
                    <span>
                      <NameText name={kill.player} />{" "}
                      <small style={{ color: "var(--mut)" }}>{kill.guild}</small>
                    </span>
                  </div>
                ))}
                {life.death ? (
                  <div className="ev dd">
                    <time className="num">{life.death.time}</time>
                    <span>☠ Killed by <NameText name={life.death.player} /> ({life.death.guild})</span>
                  </div>
                ) : (
                  <div className="ev mut"><time /><span>Survived to the end 🛡️</span></div>
                )}
              </div>
            ))}
          </>
        ) : null}
        {tab === "victims" ? (
          <div className="box"><h3><span className="k">Victims</span><span className="num">{player.victims.length}</span></h3><Meters items={player.victims} tone="k" compact /></div>
        ) : null}
        {tab === "killers" ? (
          <div className="box"><h3><span className="d">Killers</span><span className="num">{player.killers.length}</span></h3><Meters items={player.killers} tone="d" compact /></div>
        ) : null}
        {tab === "history" ? (
          <div className="tbl">
            {history.map((row) => (
              <Link key={`${row.logId}-${row.date}`} className="row hist" href={`/logs/${row.logId}`}>
                <span>{formatSiegeDate(row.date)}</span>
                <span className="gn">{row.guild}</span>
                <span className={`rk ${row.place < 4 ? `t${row.place}` : ""}`}>#{row.place}</span>
                <b className="num">{row.points} pts</b>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
