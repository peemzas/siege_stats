import type { Result } from "@/app/api/types/log.type";
import { parseAndProcessLog } from "@/app/api/utils/parseLog";
import { deriveSiege, type SiegeModel } from "./siege";

export const MAX_LOG_BYTES = 5 * 1024 * 1024;

export type LogPreview =
  | { ok: true; model: SiegeModel }
  | { ok: false; message: string; sample: string };

function firstLine(text: string): string {
  const line = text.split(/\r?\n/).map((part) => part.trim()).find(Boolean) ?? "";
  return line.slice(0, 120);
}

/** Client-side preview. Uses the existing parser and does not change its output. */
export function previewLog(text: string): LogPreview {
  const sample = firstLine(text);
  let result: Result;
  try {
    result = parseAndProcessLog(text);
  } catch {
    return { ok: false, message: "Couldn’t read this log.", sample };
  }
  const kills = result.guildResults.reduce((sum, guild) => sum + guild.totalKills, 0);
  if (kills <= 0 || result.playerResults.length === 0) {
    return { ok: false, message: "No kill lines found.", sample };
  }
  return { ok: true, model: deriveSiege(result) };
}
