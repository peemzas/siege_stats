import type { GuildStat, Result } from "@/app/api/types/log.type";
import { shortName } from "./names";

export const GUILD_COLORS = [
  "#f5c451",
  "#7c8cff",
  "#3ddc97",
  "#ff8a65",
  "#c084fc",
  "#4dd0e1",
  "#f472b6",
  "#a3e635",
  "#94a3b8",
] as const;

export function guildColor(index: number): string {
  return GUILD_COLORS[index] ?? "#64748b";
}

/** Top-N by points. Copies before sorting so the caller's array stays put. */
export function topByPoints<T extends { totalPoints: number }>(items: readonly T[], n = 3): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.totalPoints - a.item.totalPoints || a.index - b.index)
    .slice(0, n)
    .map((row) => row.item);
}

export function kdRatio(kills: number, deaths: number): string {
  if (deaths <= 0) return kills > 0 ? "∞" : "0.00";
  return (kills / deaths).toFixed(2);
}

export function kdWidth(kills: number, deaths: number): number {
  const total = kills + deaths;
  if (total <= 0) return 0;
  return (kills / total) * 100;
}

function clock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
}

export type Bar = { label: string; count: number };

export type LifeView = {
  kills: { time: string; player: string; guild: string }[];
  death?: { time: string; player: string; guild: string };
};

export type PlayerView = {
  name: string;
  guild: string;
  rank: number;
  points: number;
  kills: number;
  deaths: number;
  kd: string;
  className: string;
  bestStreak: number;
  bestLife: number;
  lives: LifeView[];
  killsByGuild: Bar[];
  deathsByGuild: Bar[];
  victims: Bar[];
  killers: Bar[];
};

export type FeedRow = {
  time: string;
  seconds: number;
  killer: string;
  killerGuild: string;
  victim: string;
  victimGuild: string;
};

export type Badge = {
  icon: string;
  label: string;
  player: string;
  guild: string;
  detail: string;
  lifeIndex?: number;
};

export type Timeline = {
  startLabel: string;
  minutes: number;
  series: { name: string; color: string; values: number[] }[];
};

export type Rivalry = { a: string; aKills: number; b: string; bKills: number };

export type SiegeModel = {
  players: PlayerView[];
  guilds: GuildStat[];
  winner: GuildStat | null;
  runnerUp: GuildStat | null;
  margin: number;
  share: number;
  totalPoints: number;
  totalKills: number;
  mvp: PlayerView | null;
  feed: FeedRow[];
  h2h: Record<string, Record<string, number>>;
  rivalries: Rivalry[];
  timeline: Timeline;
  badges: Badge[];
  topPlayers: PlayerView[];
};

function tally(map: Map<string, number>, key: string) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function barsFrom(map: Map<string, number>): Bar[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

function emptyTimeline(guilds: GuildStat[]): Timeline {
  return {
    startLabel: "—",
    minutes: 0,
    series: guilds.map((guild, index) => ({ name: guild.name, color: guildColor(index), values: [0] })),
  };
}

export function deriveSiege(result: Result): SiegeModel {
  const guilds = topByPoints(result.guildResults ?? [], (result.guildResults ?? []).length);
  const built: PlayerView[] = (result.playerResults ?? []).map((player) => {
    const victims = new Map<string, number>();
    const killers = new Map<string, number>();
    const killGuilds = new Map<string, number>();
    const deathGuilds = new Map<string, number>();
    let bestStreak = 0;
    let bestLife = 0;
    const lives: LifeView[] = (player.lives ?? []).map((life, index) => {
      const kills = (life.kills ?? []).map((kill) => {
        tally(victims, kill.playerName);
        tally(killGuilds, kill.guildName);
        return { time: kill.timestamp, player: kill.playerName, guild: kill.guildName };
      });
      if (kills.length > bestStreak) {
        bestStreak = kills.length;
        bestLife = index;
      }
      const death = life.death
        ? { time: life.death.timestamp, player: life.death.playerName, guild: life.death.guildName }
        : undefined;
      if (death) {
        tally(killers, death.player);
        tally(deathGuilds, death.guild);
      }
      return { kills, death };
    });
    return {
      name: player.name,
      guild: player.guildName,
      rank: player.rank,
      points: player.totalPoints,
      kills: player.totalKills,
      deaths: player.totalDeaths,
      kd: kdRatio(player.totalKills, player.totalDeaths),
      className: player.class ?? "",
      bestStreak,
      bestLife,
      lives,
      killsByGuild: barsFrom(killGuilds),
      deathsByGuild: barsFrom(deathGuilds),
      victims: barsFrom(victims),
      killers: barsFrom(killers),
    };
  });

  const players = [...built].sort((a, b) => b.points - a.points || b.kills - a.kills || (a.name < b.name ? -1 : 1));
  players.forEach((player, index) => {
    player.rank = index + 1;
  });

  const feed: FeedRow[] = [];
  for (const player of built) {
    for (const life of player.lives) {
      for (const kill of life.kills) {
        const seconds = clock(kill.time);
        if (seconds == null) continue;
        feed.push({
          time: kill.time,
          seconds,
          killer: player.name,
          killerGuild: player.guild,
          victim: kill.player,
          victimGuild: kill.guild,
        });
      }
    }
  }
  feed.sort((a, b) => a.seconds - b.seconds || (a.killer < b.killer ? -1 : a.killer > b.killer ? 1 : 0));

  const h2h: Record<string, Record<string, number>> = {};
  for (const guild of guilds) h2h[guild.name] = {};
  for (const row of feed) {
    if (!row.killerGuild || !row.victimGuild || row.killerGuild === row.victimGuild) continue;
    if (!h2h[row.killerGuild]) h2h[row.killerGuild] = {};
    h2h[row.killerGuild][row.victimGuild] = (h2h[row.killerGuild][row.victimGuild] ?? 0) + 1;
  }

  const rivalries: Rivalry[] = [];
  for (let i = 0; i < guilds.length; i++) {
    for (let j = i + 1; j < guilds.length; j++) {
      const a = guilds[i].name;
      const b = guilds[j].name;
      rivalries.push({ a, aKills: h2h[a]?.[b] ?? 0, b, bKills: h2h[b]?.[a] ?? 0 });
    }
  }
  rivalries.sort((left, right) => right.aKills + right.bKills - (left.aKills + left.bKills));

  const totalPoints = guilds.reduce((sum, guild) => sum + guild.totalPoints, 0);
  const totalKills = guilds.reduce((sum, guild) => sum + guild.totalKills, 0);
  const winner = guilds[0] ?? null;
  const runnerUp = guilds[1] ?? null;
  const margin = winner && runnerUp ? winner.totalPoints - runnerUp.totalPoints : winner?.totalPoints ?? 0;
  const share = winner && totalPoints > 0 ? Math.round((winner.totalPoints / totalPoints) * 100) : 0;

  return {
    players,
    guilds,
    winner,
    runnerUp,
    margin,
    share,
    totalPoints,
    totalKills,
    mvp: players[0] ?? null,
    feed,
    h2h,
    rivalries,
    timeline: buildTimeline(guilds, feed),
    badges: buildBadges(players, feed),
    topPlayers: players.slice(0, 6),
  };
}

function buildTimeline(guilds: GuildStat[], feed: FeedRow[]): Timeline {
  if (!feed.length || !guilds.length) return emptyTimeline(guilds);
  const start = feed[0].seconds;
  const end = feed[feed.length - 1].seconds;
  const minutes = Math.max(0, Math.ceil((end - start) / 60));
  const length = minutes + 1;
  const increments = new Map<string, number[]>(guilds.map((guild) => [guild.name, Array(length).fill(0)]));
  for (const row of feed) {
    const minute = Math.min(minutes, Math.max(0, Math.floor((row.seconds - start) / 60)));
    const bucket = increments.get(row.killerGuild);
    if (bucket) bucket[minute] += 1;
  }
  return {
    startLabel: feed[0].time,
    minutes,
    series: guilds.map((guild, index) => {
      const bucket = increments.get(guild.name) ?? [];
      let running = 0;
      return {
        name: guild.name,
        color: guildColor(index),
        values: bucket.map((count) => (running += count)),
      };
    }),
  };
}

function buildBadges(players: PlayerView[], feed: FeedRow[]): Badge[] {
  if (!players.length || !feed.length) return [];
  const first = feed[0];
  const last = feed[feed.length - 1];
  const streak = players.reduce((best, player) => (player.bestStreak > best.bestStreak ? player : best));
  const executioner = players.reduce((best, player) => (player.kills > best.kills ? player : best));
  const collector = [...players].sort((a, b) => b.victims.length - a.victims.length || b.kills - a.kills)[0];
  const vendetta = [...players].sort((a, b) => (b.victims[0]?.count ?? 0) - (a.victims[0]?.count ?? 0))[0];
  const touched = players.filter((player) => player.kills > 0 && player.deaths > 0);
  const untouchable = [...touched].sort((a, b) => b.kills / b.deaths - a.kills / a.deaths || b.kills - a.kills)[0];
  const streakLife = streak.lives[streak.bestLife];
  const finisher = streakLife?.death ? players.find((player) => player.name === streakLife.death?.player) : undefined;

  const badges: Badge[] = [
    {
      icon: "🩸",
      label: "First blood",
      player: first.killer,
      guild: first.killerGuild,
      detail: `${first.time} · on ${first.victim}`,
    },
    {
      icon: "💀",
      label: "Last blood",
      player: last.killer,
      guild: last.killerGuild,
      detail: `${last.time} · on ${last.victim}`,
    },
    {
      icon: "⚡",
      label: "Killstreak",
      player: streak.name,
      guild: streak.guild,
      detail: `${streak.bestStreak} kills in one life`,
      lifeIndex: streak.bestLife,
    },
  ];
  if (finisher && streak.bestStreak > 0) {
    badges.push({
      icon: "🛑",
      label: "Shutdown",
      player: finisher.name,
      guild: finisher.guild,
      detail: `ended ${shortName(streak.name)}'s ${streak.bestStreak}-streak`,
    });
  }
  badges.push({
    icon: "⚔️",
    label: "Executioner",
    player: executioner.name,
    guild: executioner.guild,
    detail: `${executioner.kills} kills`,
  });
  if (collector) {
    badges.push({
      icon: "🎯",
      label: "Collector",
      player: collector.name,
      guild: collector.guild,
      detail: `${collector.victims.length} unique targets`,
    });
  }
  if (vendetta && vendetta.victims[0]) {
    badges.push({
      icon: "🔁",
      label: "Vendetta",
      player: vendetta.name,
      guild: vendetta.guild,
      detail: `${vendetta.victims[0].count}× ${shortName(vendetta.victims[0].label)}`,
    });
  }
  if (untouchable) {
    badges.push({
      icon: "🛡️",
      label: "Untouchable",
      player: untouchable.name,
      guild: untouchable.guild,
      detail: `${untouchable.kills} kills, ${untouchable.deaths} deaths`,
    });
  }
  return badges;
}
