import type { GuildStat, PlayerStat } from "@/app/api/types/log.type";
import { searchKey } from "./names";
import { readResult } from "./summary";

export type SiegeSource = {
  id: string;
  logDate: string;
  serverName: string;
  parsed: unknown;
};

export type PlayerAppearance = {
  logId: string;
  date: string;
  server: string;
  guild: string;
  place: number;
  points: number;
  kills: number;
  deaths: number;
};

export type GuildAppearance = {
  logId: string;
  date: string;
  server: string;
  place: number;
  points: number;
  kills: number;
  deaths: number;
  players: number;
};

export type PlayerRollup = {
  name: string;
  server: string;
  guild: string;
  sieges: number;
  points: number;
  kills: number;
  deaths: number;
  mvps: number;
  avgPlace: number;
  appearances: PlayerAppearance[];
};

export type GuildRollup = {
  name: string;
  server: string;
  sieges: number;
  wins: number;
  points: number;
  kills: number;
  deaths: number;
  avgPlace: number;
  appearances: GuildAppearance[];
};

export type PlayerProfile = PlayerRollup & {
  avgPoints: number;
  avgKills: number;
  last3Points: number;
  last3Kills: number;
  series: number[];
};

export type RivalPoint = {
  logId: string;
  date: string;
  kills: number;
};

export type RivalSummary = {
  name: string;
  kills: number;
  sieges: number;
};

export type GuildProfile = GuildRollup & {
  series: number[];
  places: number[];
  opponents: RivalSummary[];
  rival: { name: string; series: RivalPoint[] } | null;
};

export type SearchGroups = {
  guilds: GuildRollup[];
  players: PlayerRollup[];
  lookalike: boolean;
};

function rankPlayers(players: readonly PlayerStat[]): { player: PlayerStat; place: number }[] {
  return players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => b.player.totalPoints - a.player.totalPoints || a.index - b.index)
    .map((row, index) => ({ player: row.player, place: index + 1 }));
}

function rankGuilds(guilds: readonly GuildStat[]): { guild: GuildStat; place: number }[] {
  return guilds
    .map((guild, index) => ({ guild, index }))
    .sort((a, b) => b.guild.totalPoints - a.guild.totalPoints || a.index - b.index)
    .map((row, index) => ({ guild: row.guild, place: index + 1 }));
}

function byDateDesc<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** One row per exact player or guild name on a server. Copies before sorting. */
export function buildCatalog(sources: readonly SiegeSource[]): { players: PlayerRollup[]; guilds: GuildRollup[] } {
  const players = new Map<string, PlayerRollup>();
  const guilds = new Map<string, GuildRollup>();

  for (const source of sources) {
    const result = readResult(source.parsed);
    if (!result) continue;
    const date = source.logDate.slice(0, 10);
    for (const row of rankPlayers(result.playerResults)) {
      const key = `${source.serverName}\0${row.player.name}`;
      const appearance: PlayerAppearance = {
        logId: source.id,
        date,
        server: source.serverName,
        guild: row.player.guildName,
        place: row.place,
        points: row.player.totalPoints,
        kills: row.player.totalKills,
        deaths: row.player.totalDeaths,
      };
      const current = players.get(key);
      if (!current) {
        players.set(key, {
          name: row.player.name,
          server: source.serverName,
          guild: row.player.guildName,
          sieges: 1,
          points: appearance.points,
          kills: appearance.kills,
          deaths: appearance.deaths,
          mvps: row.place === 1 ? 1 : 0,
          avgPlace: row.place,
          appearances: [appearance],
        });
      } else {
        current.sieges += 1;
        current.points += appearance.points;
        current.kills += appearance.kills;
        current.deaths += appearance.deaths;
        if (row.place === 1) current.mvps += 1;
        current.appearances.push(appearance);
      }
    }
    for (const row of rankGuilds(result.guildResults)) {
      const key = `${source.serverName}\0${row.guild.name}`;
      const appearance: GuildAppearance = {
        logId: source.id,
        date,
        server: source.serverName,
        place: row.place,
        points: row.guild.totalPoints,
        kills: row.guild.totalKills,
        deaths: row.guild.totalDeaths,
        players: row.guild.playerCount,
      };
      const current = guilds.get(key);
      if (!current) {
        guilds.set(key, {
          name: row.guild.name,
          server: source.serverName,
          sieges: 1,
          wins: row.place === 1 ? 1 : 0,
          points: appearance.points,
          kills: appearance.kills,
          deaths: appearance.deaths,
          avgPlace: row.place,
          appearances: [appearance],
        });
      } else {
        current.sieges += 1;
        current.wins += row.place === 1 ? 1 : 0;
        current.points += appearance.points;
        current.kills += appearance.kills;
        current.deaths += appearance.deaths;
        current.appearances.push(appearance);
      }
    }
  }

  for (const player of players.values()) {
    player.appearances = byDateDesc(player.appearances);
    player.guild = player.appearances[0]?.guild ?? player.guild;
    player.avgPlace = mean(player.appearances.map((row) => row.place));
  }
  for (const guild of guilds.values()) {
    guild.appearances = byDateDesc(guild.appearances);
    guild.avgPlace = mean(guild.appearances.map((row) => row.place));
  }

  return { players: [...players.values()], guilds: [...guilds.values()] };
}

function lookalike(query: string, name: string): boolean {
  const raw = query.trim().toLowerCase();
  if (!raw) return false;
  if (name.toLowerCase().includes(raw)) return false;
  const needle = searchKey(query);
  return Boolean(needle) && searchKey(name).includes(needle);
}

export function searchCatalog(
  catalog: { players: PlayerRollup[]; guilds: GuildRollup[] },
  query: string,
  server?: string,
): SearchGroups {
  const needle = searchKey(query.trim());
  if (!needle) return { guilds: [], players: [], lookalike: false };
  const guilds = catalog.guilds
    .filter((guild) => (!server || guild.server === server) && searchKey(guild.name).includes(needle))
    .sort((a, b) => b.wins - a.wins || b.points - a.points || (a.name < b.name ? -1 : 1))
    .slice(0, 8);
  const players = catalog.players
    .filter((player) => (!server || player.server === server) && (searchKey(player.name).includes(needle) || searchKey(player.guild).includes(needle)))
    .sort((a, b) => b.points - a.points || (a.name < b.name ? -1 : 1))
    .slice(0, 8);
  const matched = [...guilds.map((guild) => guild.name), ...players.map((player) => player.name)];
  return { guilds, players, lookalike: matched.some((name) => lookalike(query, name)) };
}

export function playerProfile(catalog: { players: PlayerRollup[] }, name: string, server: string): PlayerProfile | null {
  const player = catalog.players.find((item) => item.server === server && item.name === name);
  if (!player) return null;
  const recent = player.appearances.slice(0, 3);
  const oldestFirst = [...player.appearances].reverse();
  return {
    ...player,
    avgPoints: mean(player.appearances.map((row) => row.points)),
    avgKills: mean(player.appearances.map((row) => row.kills)),
    last3Points: mean(recent.map((row) => row.points)),
    last3Kills: mean(recent.map((row) => row.kills)),
    series: oldestFirst.map((row) => row.points),
  };
}

export function guildProfile(
  catalog: { guilds: GuildRollup[] },
  name: string,
  server: string,
  sources: readonly SiegeSource[] = [],
  versus?: string,
): GuildProfile | null {
  const guild = catalog.guilds.find((item) => item.server === server && item.name === name);
  if (!guild) return null;
  const oldestFirst = [...guild.appearances].reverse();
  const opponents = guildOpponents(sources, name);
  const rivalName = versus || opponents[0]?.name || "";
  return {
    ...guild,
    series: oldestFirst.map((row) => row.points),
    places: oldestFirst.map((row) => row.place),
    opponents: opponents.slice(0, 6),
    rival: rivalName ? { name: rivalName, series: rivalrySeries(sources, name, rivalName) } : null,
  };
}

/** Exact guild names. `Wazabz` and `Wazabz่` stay different opponents. */
export function guildOpponents(sources: readonly SiegeSource[], guildName: string): RivalSummary[] {
  const totals = new Map<string, { kills: number; sieges: number }>();
  for (const source of sources) {
    const mine = readResult(source.parsed)?.guildResults.find((guild) => guild.name === guildName);
    if (!mine) continue;
    const seen = new Set<string>();
    for (const kill of mine.kills ?? []) {
      if (!kill.name || kill.name === guildName) continue;
      const row = totals.get(kill.name) ?? { kills: 0, sieges: 0 };
      row.kills += kill.count;
      if (!seen.has(kill.name)) {
        row.sieges += 1;
        seen.add(kill.name);
      }
      totals.set(kill.name, row);
    }
  }
  return [...totals.entries()]
    .map(([name, row]) => ({ name, kills: row.kills, sieges: row.sieges }))
    .sort((a, b) => b.kills - a.kills || b.sieges - a.sieges || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Last shared sieges, oldest first. A siege counts when both exact names fielded. */
export function rivalrySeries(sources: readonly SiegeSource[], guildName: string, opponent: string, limit = 8): RivalPoint[] {
  if (!guildName || !opponent || guildName === opponent) return [];
  const points: RivalPoint[] = [];
  for (const source of sources) {
    const result = readResult(source.parsed);
    if (!result) continue;
    const mine = result.guildResults.find((guild) => guild.name === guildName);
    const theirs = result.guildResults.find((guild) => guild.name === opponent);
    if (!mine || !theirs) continue;
    points.push({
      logId: source.id,
      date: source.logDate.slice(0, 10),
      kills: mine.kills?.find((kill) => kill.name === opponent)?.count ?? 0,
    });
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.logId < b.logId ? -1 : 1));
  return points.slice(-limit);
}

export function playerBoard(players: readonly PlayerRollup[], server: string): PlayerRollup[] {
  return players
    .filter((player) => player.server === server)
    .sort((a, b) => b.points - a.points || b.kills - a.kills || (a.name < b.name ? -1 : 1));
}

export function guildBoard(guilds: readonly GuildRollup[], server: string): GuildRollup[] {
  return guilds
    .filter((guild) => guild.server === server)
    .sort((a, b) => b.wins - a.wins || b.points - a.points || (a.name < b.name ? -1 : 1));
}

export function serverSpan(sources: readonly SiegeSource[], server: string): { count: number; from: string; to: string } {
  const dates = sources
    .filter((source) => source.serverName === server)
    .map((source) => source.logDate.slice(0, 10))
    .sort();
  return { count: dates.length, from: dates[0] ?? "", to: dates[dates.length - 1] ?? "" };
}
