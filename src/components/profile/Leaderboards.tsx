"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Meters from "@/components/log/Meters";
import NameText from "@/components/log/NameText";
import { formatInt, formatSiegeDate } from "@/lib/format";
import { useServers } from "@/components/home/useSieges";
import { GAME_SERVERS } from "@/lib/servers";

type Board = {
  server: string;
  sieges: number;
  from: string;
  to: string;
  players: { name: string; guild: string; sieges: number; points: number; kills: number; deaths: number; mvps: number }[];
  guilds: { name: string; sieges: number; wins: number; points: number; avgPlace: number; form: number[] }[];
  attendance: { label: string; guilds: number; kd: number }[];
};

export default function Leaderboards() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("server") || GAME_SERVERS[0];
  const [server, setServer] = useState(initial);
  const [tab, setTab] = useState<"players" | "guilds">(params.get("tab") === "guilds" ? "guilds" : "players");
  const serversQuery = useServers();
  const options = [...GAME_SERVERS] as string[];
  for (const row of serversQuery.data ?? []) {
    if (!options.includes(row.name)) options.push(row.name);
  }
  if (!options.includes(server)) options.push(server);
  const query = useQuery({
    queryKey: ["leaderboards", server],
    queryFn: async (): Promise<Board> => {
      const response = await fetch(`/api/leaderboards?server=${encodeURIComponent(server)}`);
      if (!response.ok) throw new Error("failed");
      return response.json();
    },
  });

  function chooseServer(next: string) {
    setServer(next);
    router.replace(`/leaderboards?server=${encodeURIComponent(next)}${tab === "guilds" ? "&tab=guilds" : ""}`);
  }

  function chooseTab(next: "players" | "guilds") {
    setTab(next);
    router.replace(`/leaderboards?server=${encodeURIComponent(server)}${next === "guilds" ? "&tab=guilds" : ""}`);
  }

  const board = query.data;

  return (
    <>
      <div className="crumb">{server} / <b>Leaderboards</b></div>
      <h1 style={{ margin: "0 0 6px" }}>Leaderboards</h1>
      <div className="mut" style={{ marginBottom: 12 }}>
        {board && board.sieges > 0
          ? `${server} · ${board.sieges} ${board.sieges === 1 ? "siege" : "sieges"} (${formatSiegeDate(board.from)} → ${formatSiegeDate(board.to)})`
          : `${server} · saved sieges`}
      </div>
      <div className="tools">
        <select aria-label="Server" value={server} onChange={(event) => chooseServer(event.target.value)}>
          {options.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <div className="gchips">
          <button type="button" className={tab === "players" ? "a" : undefined} onClick={() => chooseTab("players")}>Players</button>
          <button type="button" className={tab === "guilds" ? "a" : undefined} onClick={() => chooseTab("guilds")}>Guilds</button>
        </div>
      </div>
      {query.isLoading ? (
        <div className="loglist">{Array.from({ length: 6 }, (_, index) => <div key={index} className="sk" style={{ height: 46 }} />)}</div>
      ) : null}
      {query.isError ? (
        <div className="card empty"><h3>Couldn’t load leaderboards</h3><button type="button" className="btn" onClick={() => void query.refetch()}>Try again</button></div>
      ) : null}
      {board && board.sieges === 0 ? (
        <div className="card empty"><h3>No sieges for {server} yet</h3><Link className="btn pri" href="/?upload=1">↑ Upload a log</Link></div>
      ) : null}
      {board && board.sieges > 0 && board.attendance?.some((row) => row.guilds > 0) ? (
        <section className="card" style={{ marginBottom: 16 }} aria-label="Attendance impact">
          <h2 className="sec">Attendance impact <span className="chip">{server}</span></h2>
          <Meters
            tone="g"
            format={(value) => value.toFixed(2)}
            items={board.attendance.map((row) => ({ label: row.label, count: row.kd }))}
          />
          <p className="mut" style={{ fontSize: 12, margin: "8px 0 0" }}>
            {board.attendance.map((row) => `${row.label}: ${row.guilds} guilds`).join(" · ")}. Average of each guild’s K/D. A guild with no deaths is left out.
          </p>
        </section>
      ) : null}
      {board && board.sieges > 0 && tab === "players" ? <PlayerTable server={server} rows={board.players} /> : null}
      {board && board.sieges > 0 && tab === "guilds" ? <GuildTable server={server} rows={board.guilds} /> : null}
    </>
  );
}

function PlayerTable({ server, rows }: { server: string; rows: Board["players"] }) {
  if (!rows.length) return <div className="card empty"><h3>No players</h3></div>;
  return (
    <div className="tbl">
      <div className="th lb-p"><span>#</span><span>Player</span><span>Guild</span><span className="r">Sieges</span><span className="r">Points</span><span className="r hide-sm">K</span><span className="r hide-sm">D</span><span className="r">MVP</span></div>
      {rows.map((player, index) => (
        <Link key={player.name} className="row lb-p" href={`/players/${encodeURIComponent(player.name)}?server=${encodeURIComponent(server)}`}>
          <span className={`rk ${index < 3 ? `t${index + 1}` : ""}`}>{index + 1}</span>
          <span className="pn"><NameText name={player.name} /></span>
          <span className="gn hide-sm">{player.guild}</span>
          <span className="num r hide-sm">{player.sieges}</span>
          <b className="num r">{formatInt(player.points)}</b>
          <span className="num r k hide-sm">{player.kills}</span>
          <span className="num r d hide-sm">{player.deaths}</span>
          <span className="num r g">{player.mvps ? `×${player.mvps}` : ""}</span>
        </Link>
      ))}
    </div>
  );
}

function GuildTable({ server, rows }: { server: string; rows: Board["guilds"] }) {
  if (!rows.length) return <div className="card empty"><h3>No guilds</h3></div>;
  return (
    <div className="tbl">
      <div className="th lb-g"><span>#</span><span>Guild</span><span className="r">Sieges</span><span className="r">Wins</span><span className="r">Points</span><span className="r hide-sm">Avg place</span><span className="hide-sm">Form</span></div>
      {rows.map((guild, index) => (
        <Link key={guild.name} className="row lb-g" href={`/guilds/${encodeURIComponent(guild.name)}?server=${encodeURIComponent(server)}`}>
          <span className={`rk ${index < 3 ? `t${index + 1}` : ""}`}>{index + 1}</span>
          <b>{guild.name}</b>
          <span className="num r hide-sm">{guild.sieges}</span>
          <b className="num r g">{guild.wins}</b>
          <span className="num r">{formatInt(guild.points)}</span>
          <span className="num r hide-sm">#{guild.avgPlace.toFixed(2)}</span>
          <span className="spark hide-sm">
            {guild.form.map((place, formIndex) => (
              <i key={`${formIndex}-${place}`} className={place === 1 ? "w" : undefined} style={{ height: `${Math.max(4, (11 - place) * 1.6)}px` }} />
            ))}
          </span>
        </Link>
      ))}
    </div>
  );
}
