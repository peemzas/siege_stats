"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CountUp from "@/components/log/CountUp";
import TrendLine from "@/components/TrendLine";
import { formatInt, formatSiegeDate } from "@/lib/format";
import { kdRatio } from "@/lib/siege";
import { GAME_SERVERS } from "@/lib/servers";
import type { GuildProfile as GuildData } from "@/lib/aggregate";

export default function GuildProfile({ name }: { name: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const server = params.get("server") || GAME_SERVERS[0];
  const query = useQuery({
    queryKey: ["guild", server, name],
    queryFn: async (): Promise<GuildData> => {
      const response = await fetch(`/api/guilds/${encodeURIComponent(name)}?server=${encodeURIComponent(server)}`);
      if (!response.ok) {
        const error = new Error("failed") as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return response.json();
    },
  });
  const missing = query.isError && (query.error as Error & { status?: number }).status === 404;

  return (
    <>
      <div className="crumb">{server} / Guilds / <b>{name}</b></div>
      <div className="tools">
        <select aria-label="Server" value={server} onChange={(event) => router.replace(`/guilds/${encodeURIComponent(name)}?server=${encodeURIComponent(event.target.value)}`)}>
          {GAME_SERVERS.map((item) => <option key={item} value={item}>{item}</option>)}
          {GAME_SERVERS.includes(server as (typeof GAME_SERVERS)[number]) ? null : <option value={server}>{server}</option>}
        </select>
      </div>
      {query.isLoading ? <div className="sk" style={{ height: 220 }} /> : null}
      {query.isError && !missing ? (
        <div className="card empty"><h3>Couldn’t load this guild</h3><button type="button" className="btn" onClick={() => void query.refetch()}>Try again</button></div>
      ) : null}
      {missing ? <div className="card empty"><h3>No saved sieges</h3><p>{name} has no parsed siege on {server}.</p></div> : null}
      {query.data ? <GuildBody guild={query.data} /> : null}
    </>
  );
}

function GuildBody({ guild }: { guild: GuildData }) {
  return (
    <>
      <section className="hero">
        <div className="champ">
          <div className="tag">GUILD · {guild.server.toUpperCase()}</div>
          <h1>{guild.name}</h1>
          <div className="mut">{guild.sieges} {guild.sieges === 1 ? "siege" : "sieges"} tracked · {guild.wins} {guild.wins === 1 ? "win" : "wins"}</div>
          <div className="kp">
            <div><small>Wins</small><CountUp value={guild.wins} /></div>
            <div><small>Avg place</small><b className="num">#{guild.avgPlace.toFixed(2)}</b></div>
            <div><small>Total pts</small><CountUp value={guild.points} /></div>
            <div><small>K/D</small><b className="num">{kdRatio(guild.kills, guild.deaths)}</b></div>
          </div>
        </div>
        <div className="card chart">
          <h2 className="sec">Points per siege</h2>
          <TrendLine values={guild.series} label={`Points per siege for ${guild.name}`} />
          <div className="sub2">Placement</div>
          <span className="spark" style={{ height: 28 }}>
            {guild.places.map((place, index) => (
              <i key={`${index}-${place}`} className={place === 1 ? "w" : undefined} style={{ height: `${Math.max(4, (11 - place) * 2.5)}px`, width: 10 }} />
            ))}
          </span>
        </div>
      </section>
      <h2 className="sec">Appearances</h2>
      <div className="tbl">
        {guild.appearances.map((row) => (
          <Link key={row.logId + row.date} className="row hist" href={`/logs/${row.logId}`}>
            <span>{formatSiegeDate(row.date)}</span>
            <span className={`rk ${row.place < 4 ? `t${row.place}` : ""}`}>#{row.place}</span>
            <b className="num">{formatInt(row.points)} pts</b>
            <span className="k num hide-sm">{row.kills} K</span>
            <span className="d num hide-sm">{row.deaths} D</span>
            <span className="mut hide-sm">{row.players} pl</span>
          </Link>
        ))}
      </div>
    </>
  );
}
