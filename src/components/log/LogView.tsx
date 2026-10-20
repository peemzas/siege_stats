"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Result } from "@/app/api/types/log.type";
import { formatInt, formatSiegeDate } from "@/lib/format";
import { searchKey } from "@/lib/names";
import {
  deriveSiege,
  guildColor,
  kdWidth,
  type PlayerView,
  type SiegeModel,
} from "@/lib/siege";
import CountUp from "./CountUp";
import HeadToHead from "./HeadToHead";
import KillsChart from "./KillsChart";
import MomentumStrip from "./MomentumStrip";
import { LogEmpty, LogError, LogSkeleton } from "./LogStates";
import Meters from "./Meters";
import NameText from "./NameText";
import PlayerSheet from "./PlayerSheet";
import ShareDialog from "./ShareDialog";

const TABS = [
  ["overview", "Overview"],
  ["players", "Players"],
  ["guilds", "Guilds"],
  ["h2h", "Head-to-head"],
  ["feed", "Kill feed"],
] as const;

type Tab = (typeof TABS)[number][0];

type LogPayload = {
  id: string;
  logDate: string;
  serverName: string;
  parsedData: unknown;
};

function coerceResult(value: unknown): Result | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Partial<Result>;
  if (!Array.isArray(record.playerResults) || !Array.isArray(record.guildResults)) return null;
  return record as Result;
}

function isTab(value: string | null): value is Tab {
  return TABS.some(([key]) => key === value);
}

export default function LogView({ id }: { id: string }) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialTab = search.get("tab");
  const [tab, setTab] = useState<Tab>(isTab(initialTab) ? initialTab : "overview");
  const [playerQuery, setPlayerQuery] = useState("");
  const [guildFilter, setGuildFilter] = useState("");
  const [feedQuery, setFeedQuery] = useState("");
  const [feedGuild, setFeedGuild] = useState("");
  const [feedLimit, setFeedLimit] = useState(80);
  const [openGuilds, setOpenGuilds] = useState<string[]>([]);
  const [sheet, setSheet] = useState<{ list: PlayerView[]; index: number; life?: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  const query = useQuery({
    queryKey: ["log", id],
    queryFn: async (): Promise<LogPayload> => {
      const response = await fetch(`/api/logs/${id}`);
      if (response.status === 404) {
        const error = new Error("missing");
        (error as Error & { status?: number }).status = 404;
        throw error;
      }
      if (!response.ok) throw new Error("failed");
      return response.json();
    },
  });

  const model = useMemo(() => {
    const result = coerceResult(query.data?.parsedData);
    return result ? deriveSiege(result) : null;
  }, [query.data]);

  useEffect(() => {
    const place = () => {
      const current = tabsRef.current?.querySelector<HTMLButtonElement>("[aria-selected=true]");
      const indicator = indicatorRef.current;
      if (!current || !indicator) return;
      indicator.style.width = `${Math.max(12, current.offsetWidth - 16)}px`;
      indicator.style.transform = `translateX(${current.offsetLeft + 8}px)`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [tab, query.isSuccess]);

  function selectTab(next: Tab) {
    setTab(next);
    const params = new URLSearchParams(search.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  function openPlayer(list: PlayerView[], player: PlayerView, life?: number) {
    const index = list.findIndex((item) => item.name === player.name && item.guild === player.guild);
    if (index < 0) return;
    setSheet({ list, index, life });
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  if (query.isLoading) return <LogSkeleton />;
  if (query.isError) {
    const status = (query.error as Error & { status?: number }).status;
    return <LogError missing={status === 404} />;
  }
  if (!model || !model.winner || model.feed.length === 0) return <LogEmpty />;

  const server = query.data?.serverName || "Server";
  const date = query.data?.logDate || "";
  const guildIndex = new Map(model.guilds.map((guild, index) => [guild.name, index]));

  return (
    <>
      <Hero model={model} server={server} date={date} onShare={() => setShareOpen(true)} />
      <div className="tabs" role="tablist" ref={tabsRef}>
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => selectTab(key)}>
            {label}
          </button>
        ))}
        <span className="ind" ref={indicatorRef} />
      </div>
      <div key={tab} className="panel" role="tabpanel">
        {tab === "overview" ? <Overview model={model} onOpen={(player, life) => openPlayer(model.players, player, life)} /> : null}
        {tab === "players" ? (
          <Players
            model={model}
            query={playerQuery}
            guild={guildFilter}
            onQuery={setPlayerQuery}
            onGuild={setGuildFilter}
            onOpen={(list, player) => openPlayer(list, player)}
          />
        ) : null}
        {tab === "guilds" ? (
          <Guilds
            model={model}
            open={openGuilds}
            onToggle={(name) => setOpenGuilds((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])}
            onOpenPlayer={(player) => openPlayer(model.players, player)}
          />
        ) : null}
        {tab === "h2h" ? <HeadToHead model={model} /> : null}
        {tab === "feed" ? (
          <Feed
            model={model}
            query={feedQuery}
            guild={feedGuild}
            limit={feedLimit}
            onQuery={setFeedQuery}
            onGuild={setFeedGuild}
            onMore={() => setFeedLimit((value) => value + 80)}
            onOpen={(name) => {
              const player = model.players.find((item) => item.name === name);
              if (player) openPlayer(model.players, player);
            }}
          />
        ) : null}
      </div>
      {sheet ? (
        <PlayerSheet
          player={sheet.list[sheet.index]}
          index={sheet.index}
          total={sheet.list.length}
          server={server}
          date={date}
          guildIndex={guildIndex.get(sheet.list[sheet.index].guild) ?? 0}
          focusLife={sheet.life}
          onClose={() => setSheet(null)}
          onPrev={() => setSheet((current) => current && current.index > 0 ? { ...current, index: current.index - 1, life: undefined } : current)}
          onNext={() => setSheet((current) => current && current.index < current.list.length - 1 ? { ...current, index: current.index + 1, life: undefined } : current)}
        />
      ) : null}
      {shareOpen ? (
        <ShareDialog model={model} server={server} date={date} onClose={() => setShareOpen(false)} onToast={showToast} />
      ) : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </>
  );
}

function Kd({ kills, deaths }: { kills: number; deaths: number }) {
  return (
    <span className="kd" title={`K/D ${kills}/${deaths}`}>
      <i style={{ width: `${kdWidth(kills, deaths)}%` }} />
    </span>
  );
}

function Hero({ model, server, date, onShare }: { model: SiegeModel; server: string; date: string; onShare: () => void }) {
  const winner = model.winner!;
  const mvp = model.mvp;
  return (
    <>
      <div className="crumb">Sieges / {server} / <b>{formatSiegeDate(date)}</b></div>
      <section className="hero">
        <div className="champ">
          <div className="tag">👑 CHAMPION · {server.toUpperCase()} · {formatSiegeDate(date).toUpperCase()}</div>
          <h1>{winner.name}</h1>
          <div className="mut">
            {winner.playerCount} fielded · {winner.totalKills}K / {winner.totalDeaths}D · {winner.totalDeaths ? (winner.totalKills / winner.totalDeaths).toFixed(2) : winner.totalKills} K/D
          </div>
          <div className="kp">
            <div><small>Points</small><CountUp value={winner.totalPoints} /></div>
            <div><small>Margin</small><b className="num">+{model.margin}</b></div>
            <div><small>Share</small><b className="num">{model.share}%</b></div>
            <div><small>MVP</small><b style={{ fontSize: 15 }}>{mvp ? <NameText name={mvp.name} /> : "—"}</b></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={onShare}>⤴ Share</button>
            <span className="chip" style={{ alignSelf: "center" }}>
              {model.players.length} players · {model.guilds.length} guilds · {formatInt(model.totalKills)} kills · {model.timeline.minutes}m
            </span>
          </div>
        </div>
        <div className="card stand">
          <h2 className="sec">Final standings <span className="chip">{model.guilds.length} guilds</span></h2>
          {model.guilds.map((guild, index) => (
            <div className="sr" key={guild.name}>
              <span className={`rk ${index < 3 ? `t${index + 1}` : ""}`}>{index + 1}</span>
              <span>
                <b>{guild.name}</b>
                <div className="sbar">
                  <i style={{ width: `${(guild.totalPoints / winner.totalPoints) * 100}%`, background: guildColor(index), animationDelay: `${index * 50}ms` }} />
                </div>
              </span>
              <span className="mut num r" style={{ fontSize: 12 }}>{guild.totalKills}/{guild.totalDeaths}</span>
              <b className="num r">{guild.totalPoints}</b>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Overview({ model, onOpen }: { model: SiegeModel; onOpen: (player: PlayerView, life?: number) => void }) {
  return (
    <>
      <div className="grid2">
        <KillsChart timeline={model.timeline} />
        <div className="card">
          <h2 className="sec">Top players</h2>
          {model.topPlayers.map((player, index) => (
            <div
              className="row compact"
              key={player.name}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(player)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(player);
                }
              }}
            >
              <span className={`rk ${index < 3 ? `t${index + 1}` : ""}`}>{index + 1}</span>
              <span>
                <span className="pn"><NameText name={player.name} /></span>
                <br />
                <span className="gn" style={{ fontSize: 12 }}>{player.guild}</span>
              </span>
              <b className="num pts">{player.points}</b>
              <Kd kills={player.kills} deaths={player.deaths} />
            </div>
          ))}
        </div>
      </div>
      <MomentumStrip blocks={model.momentum} guilds={model.guilds.map((guild) => guild.name)} />
      {model.survival.length ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="sec">Average survival <span className="chip">per life</span></h2>
          <Meters
            tone="g"
            suffix="s"
            items={model.survival.map((row) => ({ label: row.guild, count: row.seconds }))}
          />
          <p className="mut" style={{ fontSize: 12, margin: "8px 0 0" }}>Seconds from the opening minute, or the previous death, until the next death.</p>
        </div>
      ) : null}
      <h2 className="sec" style={{ marginTop: 20 }}>Siege badges <span className="chip">{model.badges.length} awarded</span></h2>
      <div className="badges">
        {model.badges.map((badge, index) => (
          <button
            type="button"
            className="bdg"
            key={badge.label}
            style={{ animationDelay: `${index * 50}ms`, textAlign: "left", width: "100%" }}
            onClick={() => {
              const player = model.players.find((item) => item.name === badge.player);
              if (player) onOpen(player, badge.lifeIndex);
            }}
          >
            <span className="ic">{badge.icon}</span>
            <small>{badge.label}</small>
            <b><NameText name={badge.player} /></b>
            <span>{badge.guild} · {badge.detail}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function Players({
  model,
  query,
  guild,
  onQuery,
  onGuild,
  onOpen,
}: {
  model: SiegeModel;
  query: string;
  guild: string;
  onQuery: (value: string) => void;
  onGuild: (value: string) => void;
  onOpen: (list: PlayerView[], player: PlayerView) => void;
}) {
  const needle = query.trim();
  const list = model.players.filter((player) => {
    if (guild && player.guild !== guild) return false;
    if (needle && !searchKey(player.name).includes(searchKey(needle))) return false;
    return true;
  });
  const hint = !list.length && needle
    ? model.guilds.find((item) => searchKey(item.name).includes(searchKey(needle)))
    : undefined;

  return (
    <>
      <div className="tools">
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={`Search ${model.players.length} players…`} aria-label="Search players" />
        <div className="gchips" style={{ flex: "1 1 100%" }}>
          <button type="button" className={guild ? undefined : "a"} onClick={() => onGuild("")}>All guilds</button>
          {model.guilds.map((item) => (
            <button type="button" key={item.name} className={guild === item.name ? "a" : undefined} onClick={() => onGuild(item.name)}>
              <i style={{ color: guildColor(model.guilds.indexOf(item)) }}>●</i> {item.name}
            </button>
          ))}
        </div>
      </div>
      {list.length ? (
        <div className="tbl">
          <div className="th"><span>#</span><span>Player</span><span>Guild</span><span className="r">Points</span><span className="r">Kills</span><span className="r">Deaths</span><span>K/D</span><span /></div>
          {list.map((player) => (
            <div
              className="row"
              key={`${player.name}-${player.guild}`}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(list, player)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpen(list, player);
                }
              }}
            >
              <span className={`rk c-rk ${player.rank < 4 ? `t${player.rank}` : ""}`}>{player.rank}</span>
              <span className="pn c-nm">
                {player.className ? <Image src={`/images/classes/${player.className}.png`} alt={player.className} width={22} height={22} style={{ verticalAlign: "middle", marginRight: 6 }} /> : null}
                <NameText name={player.name} />
              </span>
              <span className="gn c-gn">{player.guild}</span>
              <span className="pts num r c-pts">{player.points}</span>
              <span className="k num r c-k">{player.kills}</span>
              <span className="d num r c-d">{player.deaths}</span>
              <span className="c-kd"><Kd kills={player.kills} deaths={player.deaths} /></span>
              <span className="chev">›</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="tbl empty">
          <div className="ic">🔍</div>
          <h3>No players match “{needle}”</h3>
          <p>
            {hint ? <>Did you mean guild <b className="g">{hint.name}</b>? </> : "Try another spelling. Names are matched without changing how they are shown."}
          </p>
          <button type="button" className="btn" onClick={() => { onQuery(""); onGuild(hint?.name ?? ""); }}>
            {hint ? `Show ${hint.name} players` : "Clear filters"}
          </button>
        </div>
      )}
    </>
  );
}

function Guilds({
  model,
  open,
  onToggle,
  onOpenPlayer,
}: {
  model: SiegeModel;
  open: string[];
  onToggle: (name: string) => void;
  onOpenPlayer: (player: PlayerView) => void;
}) {
  return (
    <div className="tbl">
      <div className="th"><span>#</span><span>Guild</span><span>Players</span><span className="r">Points</span><span className="r">Kills</span><span className="r">Deaths</span><span>K/D</span><span /></div>
      {model.guilds.map((guild, index) => {
        const expanded = open.includes(guild.name);
        const roster = model.players.filter((player) => player.guild === guild.name).slice(0, 5);
        const kills = Object.entries(model.h2h[guild.name] ?? {})
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);
        const deaths = model.guilds
          .filter((other) => (model.h2h[other.name]?.[guild.name] ?? 0) > 0)
          .map((other) => ({ label: other.name, count: model.h2h[other.name][guild.name] }))
          .sort((a, b) => b.count - a.count);
        return (
          <div key={guild.name}>
            <div
              className="row"
              role="button"
              tabIndex={0}
              aria-expanded={expanded}
              onClick={() => onToggle(guild.name)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggle(guild.name);
                }
              }}
            >
              <span className={`rk c-rk ${index < 3 ? `t${index + 1}` : ""}`}>{index + 1}</span>
              <span className="pn c-nm"><i style={{ color: guildColor(index), fontStyle: "normal" }}>⬢</i> {guild.name}</span>
              <span className="gn c-gn">{guild.playerCount} players</span>
              <span className="pts num r c-pts">{guild.totalPoints}</span>
              <span className="k num r c-k">{guild.totalKills}</span>
              <span className="d num r c-d">{guild.totalDeaths}</span>
              <span className="c-kd"><Kd kills={guild.totalKills} deaths={guild.totalDeaths} /></span>
              <span className="chev">›</span>
            </div>
            <div className={`exp${expanded ? " open" : ""}`}>
              <div>
                <div className="det">
                  <div className="box">
                    <h3><span>Points</span><span className="num">{guild.totalPoints}</span></h3>
                    <Meters active={expanded} tone="k" max={guild.totalPoints} items={[{ label: "From kills", count: guild.totalPointsFromKills }]} />
                    <Meters active={expanded} tone="g" max={guild.totalPoints} items={[{ label: "Extra life", count: guild.totalExtraLifePoints }]} />
                    <div className="sub2">Top players</div>
                    {roster.map((player) => (
                      <button
                        type="button"
                        key={player.name}
                        onClick={() => onOpenPlayer(player)}
                        style={{ display: "block", width: "100%", background: "none", border: 0, padding: 0, textAlign: "left" }}
                      >
                        <Meters active={expanded} items={[{ label: player.name, count: player.points }]} tone="k" compact max={model.players[0]?.points || 1} />
                      </button>
                    ))}
                  </div>
                  <div className="box">
                    <h3><span className="k">Kills vs guild</span><span className="num">{guild.totalKills}</span></h3>
                    <Meters active={expanded} items={kills} tone="k" />
                    <div className="sub2">Killed by guild</div>
                    <Meters active={expanded} items={deaths} tone="d" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Feed({
  model,
  query,
  guild,
  limit,
  onQuery,
  onGuild,
  onMore,
  onOpen,
}: {
  model: SiegeModel;
  query: string;
  guild: string;
  limit: number;
  onQuery: (value: string) => void;
  onGuild: (value: string) => void;
  onMore: () => void;
  onOpen: (name: string) => void;
}) {
  const needle = searchKey(query.trim());
  const rows = model.feed.filter((row) => {
    if (guild && row.killerGuild !== guild && row.victimGuild !== guild) return false;
    if (needle && !searchKey(row.killer).includes(needle) && !searchKey(row.victim).includes(needle)) return false;
    return true;
  });
  const shown = rows.slice(0, limit);
  return (
    <>
      <div className="tools">
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Filter killer or victim…" aria-label="Filter kill feed" />
        <select value={guild} onChange={(event) => onGuild(event.target.value)} aria-label="Filter feed by guild">
          <option value="">All guilds</option>
          {model.guilds.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
        <span className="chip">{formatInt(rows.length)} kills</span>
      </div>
      {shown.length ? (
        <div className="card feed" style={{ padding: 0 }}>
          {shown.map((row, index) => (
            <div className="fe" key={`${row.time}-${row.killer}-${row.victim}-${index}`}>
              <time className="num">{row.time}</time>
              <span>
                <button type="button" onClick={() => onOpen(row.killer)} style={{ background: "none", border: 0, padding: 0, fontWeight: 700 }}>
                  <NameText name={row.killer} />
                </button>
                <span className="gt" style={{ color: guildColor(model.guilds.findIndex((guildItem) => guildItem.name === row.killerGuild)) }}>{row.killerGuild}</span>
              </span>
              <span className="d">☠</span>
              <span>
                <button type="button" onClick={() => onOpen(row.victim)} style={{ background: "none", border: 0, padding: 0 }}>
                  <NameText name={row.victim} />
                </button>
                <span className="gt" style={{ color: guildColor(model.guilds.findIndex((guildItem) => guildItem.name === row.victimGuild)) }}>{row.victimGuild}</span>
              </span>
            </div>
          ))}
          {shown.length < rows.length ? (
            <div style={{ textAlign: "center", padding: 12 }}>
              <button type="button" className="btn" onClick={onMore}>Show more</button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="card empty">
          <div className="ic">🔍</div>
          <h3>No kills match</h3>
          <p>Clear the killer, victim, or guild filter.</p>
          <button type="button" className="btn" onClick={() => { onQuery(""); onGuild(""); }}>Clear filters</button>
        </div>
      )}
    </>
  );
}
