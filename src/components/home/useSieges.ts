"use client";

import { useQuery } from "@tanstack/react-query";
import type { SavedSiege } from "@/lib/summary";

export type ServerCount = { name: string; count: number };

function asSaved(value: unknown): SavedSiege | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  return {
    id: row.id,
    logDate: typeof row.logDate === "string" ? row.logDate : "",
    serverName: typeof row.serverName === "string" ? row.serverName : "",
    createdAt: typeof row.createdAt === "string" ? row.createdAt : "",
    winner: typeof row.winner === "string" ? row.winner : "",
    winnerPoints: typeof row.winnerPoints === "number" ? row.winnerPoints : 0,
    mvp: typeof row.mvp === "string" ? row.mvp : "",
    mvpGuild: typeof row.mvpGuild === "string" ? row.mvpGuild : "",
    mvpPoints: typeof row.mvpPoints === "number" ? row.mvpPoints : 0,
    guildCount: typeof row.guildCount === "number" ? row.guildCount : 0,
    playerCount: typeof row.playerCount === "number" ? row.playerCount : 0,
    kills: typeof row.kills === "number" ? row.kills : 0,
  };
}

export function useServers() {
  return useQuery({
    queryKey: ["servers"],
    queryFn: async (): Promise<ServerCount[]> => {
      const response = await fetch("/api/logs");
      if (!response.ok) throw new Error("Couldn't load servers");
      const data = (await response.json()) as { servers?: unknown };
      if (!Array.isArray(data.servers)) return [];
      return data.servers.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as { name?: unknown; count?: unknown };
        if (typeof row.name !== "string") return [];
        return [{ name: row.name, count: typeof row.count === "number" ? row.count : 0 }];
      });
    },
  });
}

export function useSieges(server: string) {
  return useQuery({
    queryKey: ["logs", server],
    enabled: Boolean(server),
    queryFn: async (): Promise<SavedSiege[]> => {
      const response = await fetch(`/api/logs?serverName=${encodeURIComponent(server)}`);
      if (!response.ok) throw new Error("Couldn't load sieges");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("Couldn't load sieges");
      return data.flatMap((row) => {
        const saved = asSaved(row);
        return saved ? [saved] : [];
      });
    },
  });
}
