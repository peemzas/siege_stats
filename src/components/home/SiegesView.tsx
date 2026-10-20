"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { formatSiegeDate } from "@/lib/format";
import { searchKey } from "@/lib/names";
import { GAME_SERVERS } from "@/lib/servers";
import SiegeList from "./SiegeList";
import { useServers, useSieges } from "./useSieges";

function serverOptions(extra: { name: string }[]): string[] {
  const names: string[] = [...GAME_SERVERS];
  for (const row of extra) {
    if (!names.includes(row.name)) names.push(row.name);
  }
  return names;
}

export default function SiegesView() {
  const params = useSearchParams();
  const requested = params.get("server");
  const [server, setServer] = useState(requested && requested.length > 0 ? requested : GAME_SERVERS[0]);
  const [query, setQuery] = useState("");
  const serversQuery = useServers();
  const siegesQuery = useSieges(server);
  const options = serverOptions(serversQuery.data ?? []);

  const sieges = useMemo(() => siegesQuery.data ?? [], [siegesQuery.data]);
  const filtered = useMemo(() => {
    const needle = searchKey(query.trim());
    if (!needle) return sieges;
    const raw = query.trim();
    return sieges.filter((siege) =>
      searchKey(siege.winner).includes(needle) ||
      searchKey(siege.mvp).includes(needle) ||
      searchKey(siege.mvpGuild).includes(needle) ||
      searchKey(formatSiegeDate(siege.logDate)).includes(needle) ||
      siege.logDate.includes(raw)
    );
  }, [sieges, query]);

  const noMatches = !siegesQuery.isLoading && !siegesQuery.isError && sieges.length > 0 && filtered.length === 0;

  return (
    <>
      <div className="crumb">Home / <b>Sieges</b></div>
      <h1 style={{ margin: "0 0 12px" }}>Sieges</h1>
      <div className="tools stack">
        <select aria-label="Server" value={server} onChange={(event) => setServer(event.target.value)}>
          {options.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
          {options.includes(server) ? null : <option value={server}>{server}</option>}
        </select>
        <input
          aria-label="Filter sieges"
          placeholder="Filter by winner, MVP, or date"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {noMatches ? (
        <div className="card empty">
          <div className="ic">🔍</div>
          <h3>No matching sieges</h3>
          <p>Nothing on {server} matches “{query.trim()}”.</p>
          <button type="button" className="btn" onClick={() => setQuery("")}>Clear filter</button>
        </div>
      ) : (
        <SiegeList
          sieges={filtered}
          loading={siegesQuery.isLoading}
          error={siegesQuery.isError}
          onRetry={() => void siegesQuery.refetch()}
          emptyTitle={`No sieges for ${server} yet`}
          emptyBody="Be the first to upload a battlelog for this server."
        />
      )}
    </>
  );
}
