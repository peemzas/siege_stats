import { formatInt, formatSiegeDate } from "./format";
import type { SiegeModel } from "./siege";

/** Plain text for Discord. Names are copied exactly as stored. */
export function discordText(model: SiegeModel, server: string, date: string, url: string): string {
  const winner = model.winner?.name ?? "Unknown";
  const points = model.winner?.totalPoints ?? 0;
  const kills = model.winner?.totalKills ?? 0;
  const mvp = model.mvp;
  const mvpLine = mvp ? `MVP ${mvp.name} (${mvp.guild}) · ${formatInt(mvp.points)} pts` : "No MVP";
  return [
    `👑 ${winner} won ${server} on ${formatSiegeDate(date)}`,
    `${formatInt(points)} pts · +${formatInt(model.margin)} margin · ${formatInt(kills)} kills`,
    mvpLine,
    url,
  ].join("\n");
}
