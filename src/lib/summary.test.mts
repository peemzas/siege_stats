import assert from "node:assert/strict";
import test from "node:test";
import { sameDaySieges, summarizeParsed, winsByGuild } from "./summary";

test("summarizeParsed does not sort the stored arrays", () => {
  const guilds = [
    { name: "Wazabz", totalPoints: 10, totalKills: 4, totalDeaths: 1, playerCount: 2, totalPointsFromKills: 8, totalExtraLifePoints: 2, rank: 2, kills: [], killedBy: [] },
    { name: "Wazabz่", totalPoints: 40, totalKills: 12, totalDeaths: 3, playerCount: 4, totalPointsFromKills: 30, totalExtraLifePoints: 10, rank: 1, kills: [], killedBy: [] },
  ];
  const players = [
    { name: "BNE #14F93D", guildName: "Wazabz่", totalPoints: 9, totalKills: 4, totalDeaths: 1, rank: 1, class: "", totalKillsEachGuild: [], totalDeathsEachGuild: [], kills: [], killedBy: [], lives: [] },
  ];
  Object.freeze(guilds);
  Object.freeze(players);
  const summary = summarizeParsed({ guildResults: guilds, playerResults: players });
  assert.equal(summary.winner, "Wazabz่");
  assert.equal(summary.mvp, "BNE #14F93D");
  assert.equal(summary.mvpGuild, "Wazabz่");
  assert.deepEqual(guilds.map((guild) => guild.name), ["Wazabz", "Wazabz่"]);
});

test("same-day matches and win counts keep guild names exact", () => {
  const logs = [
    { logDate: "2026-10-17", winner: "Wazabz" },
    { logDate: "2026-10-17T00:00:00.000Z", winner: "Wazabz่" },
    { logDate: "2026-10-10", winner: "Wazabz่" },
  ];
  Object.freeze(logs);
  assert.equal(sameDaySieges(logs, "2026-10-17").length, 2);
  assert.deepEqual(winsByGuild(logs), [
    { name: "Wazabz่", wins: 2 },
    { name: "Wazabz", wins: 1 },
  ]);
});
