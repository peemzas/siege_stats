"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { calendarDate, GAME_SERVERS, recentSaturdays } from "@/lib/servers";
import { winsByGuild } from "@/lib/summary";
import SiegeList from "./SiegeList";
import Uploader from "./Uploader";
import { useServers, useSieges } from "./useSieges";

function serverOptions(known: readonly string[], extra: { name: string }[]): string[] {
  const names = [...known];
  for (const row of extra) {
    if (!names.includes(row.name)) names.push(row.name);
  }
  return names;
}

export default function HomeView() {
  const params = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const [server, setServer] = useState<string>(GAME_SERVERS[0]);
  const [date, setDate] = useState("");
  const serversQuery = useServers();
  const siegesQuery = useSieges(server);

  useEffect(() => {
    setDate((current) => current || recentSaturdays(1)[0] || calendarDate(new Date()));
  }, []);

  useEffect(() => {
    if (params.get("upload") !== "1") return;
    setExpanded(true);
  }, [params]);

  useEffect(() => {
    if (!expanded || params.get("upload") !== "1") return;
    const node = document.getElementById("upload");
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded, params]);

  const options = serverOptions(GAME_SERVERS, serversQuery.data ?? []);
  const sieges = siegesQuery.data ?? [];
  const ranked = winsByGuild(sieges);
  const top = ranked[0];

  return (
    <>
      <div className="uphero">
        <h1>Guild Siege <span className="g">Stats</span></h1>
        <p>Upload a Flyff Universe battlelog — MVPs, badges, rivalries, and every life’s kill timeline.</p>
      </div>

      <div className={expanded ? undefined : "grid2"}>
        <div id="upload" className={`card rise ${expanded ? "upc" : ""}`}>
          <Uploader
            expanded={expanded}
            onExpand={() => setExpanded(true)}
            onCollapse={() => setExpanded(false)}
            server={server}
            date={date}
            servers={options}
            onServer={setServer}
            onDate={setDate}
            sieges={sieges}
            siegesLoading={siegesQuery.isLoading || siegesQuery.isFetching}
            siegesError={siegesQuery.isError}
          />
        </div>
        {expanded ? null : (
          <div className="card rise" style={{ animationDelay: "60ms" }}>
            <h2 className="sec">
              {server} saved
              {siegesQuery.isSuccess ? <span className="chip">{sieges.length} sieges</span> : null}
            </h2>
            {siegesQuery.isLoading ? (
              <div className="sk" style={{ height: 72 }} />
            ) : siegesQuery.isError ? (
              <p className="mut">Saved totals appear once the siege list loads.</p>
            ) : top ? (
              <div className="box">
                <small className="mut">Most wins</small>
                <br />
                <b className="g" style={{ fontSize: 20 }}>{top.name}</b>
                <div className="mut num">{top.wins} {top.wins === 1 ? "win" : "wins"}</div>
              </div>
            ) : (
              <p className="mut">No sieges saved for {server} yet.</p>
            )}
          </div>
        )}
      </div>

      <h2 className="sec" style={{ marginTop: 22 }}>
        Latest sieges · {server}
        <Link className="btn" href={`/sieges?server=${encodeURIComponent(server)}`}>All sieges →</Link>
      </h2>
      <SiegeList
        sieges={sieges.slice(0, 5)}
        loading={siegesQuery.isLoading}
        error={siegesQuery.isError}
        onRetry={() => void siegesQuery.refetch()}
        emptyTitle={`No sieges for ${server} yet`}
        emptyBody="Be the first to upload a battlelog for this server."
        skeletons={4}
      />
    </>
  );
}
