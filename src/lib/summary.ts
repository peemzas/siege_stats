import type { Result } from "@/app/api/types/log.type";

export type LogSummary = {
  winner: string;
  winnerPoints: number;
  mvp: string;
  mvpGuild: string;
  mvpPoints: number;
  guildCount: number;
  playerCount: number;
  kills: number;
};

export type SavedSiege = LogSummary & {
  id: string;
  logDate: string;
  serverName: string;
  createdAt: string;
};

const EMPTY: LogSummary = {
  winner: "",
  winnerPoints: 0,
  mvp: "",
  mvpGuild: "",
  mvpPoints: 0,
  guildCount: 0,
  playerCount: 0,
  kills: 0,
};

function asResult(value: unknown): Result | null {
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
  if (!Array.isArray(record.guildResults) || !Array.isArray(record.playerResults)) return null;
  return record as Result;
}

/** Reads a saved parse. Copies before sorting so the stored arrays stay in their original order. */
export function summarizeParsed(value: unknown): LogSummary {
  const result = asResult(value);
  if (!result) return EMPTY;
  const guilds = [...result.guildResults].sort((a, b) => b.totalPoints - a.totalPoints);
  const players = [...result.playerResults].sort((a, b) => b.totalPoints - a.totalPoints);
  const winner = guilds[0];
  const mvp = players[0];
  return {
    winner: winner?.name ?? "",
    winnerPoints: winner?.totalPoints ?? 0,
    mvp: mvp?.name ?? "",
    mvpGuild: mvp?.guildName ?? "",
    mvpPoints: mvp?.totalPoints ?? 0,
    guildCount: guilds.length,
    playerCount: players.length,
    kills: guilds.reduce((sum, guild) => sum + guild.totalKills, 0),
  };
}

/** Same server is already implied by the list. Match the calendar day only. */
export function sameDaySieges<T extends { logDate: string }>(logs: readonly T[], date: string): T[] {
  const day = date.slice(0, 10);
  return logs.filter((log) => log.logDate.slice(0, 10) === day);
}

/** Exact winner strings. `Wazabz` and `Wazabz่` stay separate. */
export function winsByGuild(logs: readonly { winner: string }[]): { name: string; wins: number }[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (!log.winner) continue;
    if (!counts.has(log.winner)) order.push(log.winner);
    counts.set(log.winner, (counts.get(log.winner) ?? 0) + 1);
  }
  return order
    .map((name) => ({ name, wins: counts.get(name) ?? 0 }))
    .sort((a, b) => b.wins - a.wins || order.indexOf(a.name) - order.indexOf(b.name));
}
