"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import CountUp from "@/components/log/CountUp";
import NameText from "@/components/log/NameText";
import TrendLine from "@/components/TrendLine";
import { formatInt, formatSiegeDate } from "@/lib/format";
import { GAME_SERVERS } from "@/lib/servers";
import type { PlayerProfile as PlayerData } from "@/lib/aggregate";

function trend(recent: number, average: number): number | null {
  if (average <= 0) return null;
  return (recent / average - 1) * 100;
}

function Trend({ value }: { value: number | null }) {
  if (value == null || Number.isNaN(value)) return null;
  const up = value >= 0;
  return <span className={`trend ${up ? "up" : "dn2"}`}>{up ? "↑" : "↓"} {Math.abs(value).toFixed(0)}%</span>;
}

export default function PlayerProfile({ name }: { name: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const server = params.get("server") || GAME_SERVERS[0];
  const query = useQuery({
    queryKey: ["player", server, name],
    queryFn: async (): Promise<PlayerData> => {
      const response = await fetch(`/api/players/${encodeURIComponent(name)}?server=${encodeURIComponent(server)}`);
      if (!response.ok) {
        const error = new Error(response.status === 404 ? "missing" : "failed") as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      return response.json();
    },
  });

  function chooseServer(next: string) {
    router.replace(`/players/${encodeURIComponent(name)}?server=${encodeURIComponent(next)}`);
  }

  const missing = query.isError && (query.error as Error & { status?: number }).status === 404;

  return (
    <>
      <div className="crumb">{server} / Players / <b>{name}</b></div>
      <div className="tools">
        <select aria-label="Server" value={server} onChange={(event) => chooseServer(event.target.value)}>
          {GAME_SERVERS.map((item) => <option key={item} value={item}>{item}</option>)}
          {GAME_SERVERS.includes(server as (typeof GAME_SERVERS)[number]) ? null : <option value={server}>{server}</option>}
        </select>
      </div>
      {query.isLoading ? <div className="sk" style={{ height: 220 }} /> : null}
      {query.isError && !missing ? (
        <div className="card empty"><h3>Couldn’t load this player</h3><button type="button" className="btn" onClick={() => void query.refetch()}>Try again</button></div>
      ) : null}
      {missing ? (
        <div className="card empty">
          <h3>No saved sieges</h3>
          <p>{name} has no parsed siege on {server}.</p>
        </div>
      ) : null}
      {query.data ? <PlayerBody player={query.data} /> : null}
    </>
  );
}

function PlayerBody({ player }: { player: PlayerData }) {
  const pointsTrend = player.sieges > 1 ? trend(player.last3Points, player.avgPoints) : null;
  const killsTrend = player.sieges > 1 ? trend(player.last3Kills, player.avgKills) : null;
  return (
    <>
      <section className="hero">
        <div className="champ">
          <div className="tag">PLAYER · {player.server.toUpperCase()}</div>
          <h1><NameText name={player.name} /></h1>
          <div className="mut">
            <Link href={`/guilds/${encodeURIComponent(player.guild)}?server=${encodeURIComponent(player.server)}`}>{player.guild}</Link>
            {" "}· {player.sieges} {player.sieges === 1 ? "siege" : "sieges"} tracked
          </div>
          <div className="kp">
            <div><small>Points</small><CountUp value={player.points} /></div>
            <div><small>Kills</small><CountUp value={player.kills} /></div>
            <div><small>Avg place</small><b className="num">#{player.avgPlace.toFixed(1)}</b></div>
            <div><small>MVP</small><b className="num g">×{player.mvps}</b></div>
          </div>
        </div>
        <div className="card">
          <h2 className="sec">Last 3 vs average</h2>
          <div className="grid2" style={{ gap: 10 }}>
            <div className="box">
              <small className="mut">Points</small><br />
              <b style={{ fontSize: 22 }}>{formatInt(player.last3Points)}</b>{" "}
              <span className="mut">avg {formatInt(player.avgPoints)}</span> <Trend value={pointsTrend} />
            </div>
            <div className="box">
              <small className="mut">Kills</small><br />
              <b style={{ fontSize: 22 }}>{formatInt(player.last3Kills)}</b>{" "}
              <span className="mut">avg {formatInt(player.avgKills)}</span> <Trend value={killsTrend} />
            </div>
          </div>
          <div className="chart" style={{ marginTop: 12 }}>
            <TrendLine values={player.series} label={`Points per siege for ${player.name}`} />
          </div>
          <div className="mut" style={{ fontSize: 12 }}>Points per siege, oldest → newest</div>
        </div>
      </section>
      <h2 className="sec">Siege history</h2>
      <div className="tbl">
        <div className="th hist"><span>Date</span><span>Guild</span><span>Place</span><span className="r">Points</span><span className="r">K</span><span className="r">D</span></div>
        {player.appearances.map((row) => (
          <Link key={row.logId + row.date} className="row hist" href={`/logs/${row.logId}`}>
            <span>{formatSiegeDate(row.date)}</span>
            <span className="gn">{row.guild}</span>
            <span className={`rk ${row.place < 4 ? `t${row.place}` : ""}`}>#{row.place}</span>
            <b className="num r">{formatInt(row.points)}</b>
            <span className="num r k hide-sm">{row.kills}</span>
            <span className="num r d hide-sm">{row.deaths}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
