"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type GuildHit = { name: string; server: string; sieges: number; wins: number; points: number };
type PlayerHit = { name: string; server: string; guild: string; sieges: number; points: number };

type Payload = { guilds: GuildHit[]; players: PlayerHit[]; lookalike: boolean };

function hrefFor(kind: "guild" | "player", name: string, server: string) {
  const path = kind === "guild" ? "guilds" : "players";
  return `/${path}/${encodeURIComponent(name)}?server=${encodeURIComponent(server)}`;
}

export default function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const needle = query.trim();
    if (!needle) {
      setData(null);
      setFailed(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(needle)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("search failed");
          return response.json() as Promise<Payload>;
        })
        .then((payload) => {
          if (cancelled) return;
          setData(payload);
          setFailed(false);
          setActive(0);
        })
        .catch((error: unknown) => {
          if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
          setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const items = useMemo(() => {
    const guilds = (data?.guilds ?? []).map((guild) => ({ kind: "guild" as const, ...guild }));
    const players = (data?.players ?? []).map((player) => ({ kind: "player" as const, ...player }));
    return [...guilds, ...players];
  }, [data]);

  function open(index: number) {
    const item = items[index];
    if (!item) return;
    router.push(hrefFor(item.kind, item.name, item.server));
    onClose();
  }

  return (
    <div className="pal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="card box" role="dialog" aria-modal="true" aria-label="Search players and guilds">
        <input
          ref={inputRef}
          aria-label="Search"
          placeholder="Search player or guild…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((current) => Math.min(items.length - 1, current + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => Math.max(0, current - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              open(active);
            }
          }}
        />
        {data?.lookalike ? (
          <div className="grp">Matched with lookalikes. Names stay as stored.</div>
        ) : null}
        {!query.trim() ? (
          <div className="empty" style={{ padding: 24 }}>
            <h3>Search saved sieges</h3>
            <p>Find a player or guild across logs already stored. I, l, and 1 match each other. Tone marks are ignored while searching.</p>
          </div>
        ) : null}
        {loading ? <div className="grp">Searching…</div> : null}
        {failed ? <div className="empty" style={{ padding: 24 }}><h3>Couldn’t search sieges</h3></div> : null}
        {data && !loading && !failed && items.length === 0 ? (
          <div className="empty" style={{ padding: 24 }}>
            <h3>No matches</h3>
            <p>Nothing stored matches “{query.trim()}”.</p>
          </div>
        ) : null}
        {data && data.guilds.length ? <div className="grp">Guilds</div> : null}
        {data?.guilds.map((guild, index) => (
          <button
            key={`${guild.server}-${guild.name}`}
            type="button"
            className={`it ${index === active ? "a" : ""}`}
            onMouseEnter={() => setActive(index)}
            onClick={() => open(index)}
          >
            <span className="g">⬢</span>
            <span><b>{guild.name}</b> <span className="mut">{guild.server} · {guild.wins} wins · {guild.sieges} sieges</span></span>
          </button>
        ))}
        {data && data.players.length ? <div className="grp">Players</div> : null}
        {data?.players.map((player, index) => {
          const itemIndex = (data?.guilds.length ?? 0) + index;
          return (
            <button
              key={`${player.server}-${player.name}`}
              type="button"
              className={`it ${itemIndex === active ? "a" : ""}`}
              onMouseEnter={() => setActive(itemIndex)}
              onClick={() => open(itemIndex)}
            >
              <span>⚔</span>
              <span><b>{player.name}</b> <span className="mut">{player.guild} · {player.server} · {player.points.toLocaleString("en-US")} pts</span></span>
            </button>
          );
        })}
        <div className="grp" style={{ paddingBottom: 10 }}>↑↓ to navigate · ↵ open · esc close</div>
      </div>
    </div>
  );
}
