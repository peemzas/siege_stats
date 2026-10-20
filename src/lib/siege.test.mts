import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Result } from "../app/api/types/log.type";
import { decodeRouteName, searchKey, splitName } from "./names";
import { deriveSiege, topByPoints } from "./siege";

type Fixture = {
  guilds: {
    name: string;
    totalPoints: number;
    totalKills: number;
    totalDeaths: number;
    playerCount: number;
    totalPointsFromKills: number;
    totalExtraLifePoints: number;
  }[];
  players: {
    name: string;
    guild: string;
    pts: number;
    k: number;
    d: number;
    kg: { count: number; guildName: string }[];
    dg: { count: number; guildName: string }[];
    kp: { name: string; count: number }[];
    dp: { name: string; count: number }[];
    lives: { k: [string, string, string][]; d?: [string, string, string] }[];
  }[];
  h2h: Record<string, Record<string, number>>;
  badges: string[][];
};

const fixture = JSON.parse(readFileSync(new URL("../../fixtures/lawolf-2026-10-17.json", import.meta.url), "utf8")) as Fixture;

function toResult(data: Fixture): Result {
  return {
    playerResults: data.players.map((player, index) => ({
      name: player.name,
      rank: index + 1,
      guildName: player.guild,
      class: "",
      totalPoints: player.pts,
      totalKills: player.k,
      totalDeaths: player.d,
      totalKillsEachGuild: player.kg,
      totalDeathsEachGuild: player.dg,
      kills: player.kp,
      killedBy: player.dp,
      lives: player.lives.map((life) => ({
        kills: life.k.map(([timestamp, playerName, guildName]) => ({ timestamp, playerName, guildName })),
        death: life.d ? { timestamp: life.d[0], playerName: life.d[1], guildName: life.d[2] } : undefined,
      })),
    })),
    guildResults: data.guilds.map((guild, index) => ({
      name: guild.name,
      rank: index + 1,
      playerCount: guild.playerCount,
      totalPointsFromKills: guild.totalPointsFromKills,
      totalExtraLifePoints: guild.totalExtraLifePoints,
      totalPoints: guild.totalPoints,
      totalKills: guild.totalKills,
      totalDeaths: guild.totalDeaths,
      kills: Object.entries(data.h2h[guild.name] ?? {}).map(([name, count]) => ({ name, count })),
      killedBy: [],
    })),
  };
}

test("momentum ties go to the higher standing and keep both guild names", () => {
  const result = toResult(fixture);
  const model = deriveSiege({
    guildResults: [
      { ...result.guildResults[0], name: "OracIe", totalPoints: 10, totalKills: 1, totalDeaths: 0, playerCount: 1, kills: [], killedBy: [] },
      { ...result.guildResults[0], name: "Wazabz่", totalPoints: 9, totalKills: 1, totalDeaths: 0, playerCount: 1, kills: [], killedBy: [] },
    ],
    playerResults: [
      {
        name: "A",
        guildName: "Wazabz่",
        rank: 1,
        totalPoints: 1,
        totalKills: 1,
        totalDeaths: 0,
        totalKillsEachGuild: [],
        totalDeathsEachGuild: [],
        kills: [],
        killedBy: [],
        lives: [{ kills: [{ timestamp: "20:21:00", playerName: "B", guildName: "OracIe" }] }],
      },
      {
        name: "B",
        guildName: "OracIe",
        rank: 2,
        totalPoints: 1,
        totalKills: 1,
        totalDeaths: 0,
        totalKillsEachGuild: [],
        totalDeathsEachGuild: [],
        kills: [],
        killedBy: [],
        lives: [{ kills: [{ timestamp: "20:22:00", playerName: "A", guildName: "Wazabz่" }] }],
      },
    ],
  });
  assert.deepEqual(model.momentum, [{ startLabel: "20:20", endLabel: "20:30", guild: "OracIe", kills: 1 }]);
});

test("topByPoints does not sort the original array", () => {
  const guilds = [
    { name: "SkyFall", totalPoints: 181 },
    { name: "OracIe", totalPoints: 524 },
    { name: "Wazabz่", totalPoints: 421 },
  ];
  const before = guilds.map((guild) => guild.name);
  const top = topByPoints(guilds, 3);
  assert.deepEqual(guilds.map((guild) => guild.name), before);
  assert.deepEqual(top.map((guild) => guild.name), ["OracIe", "Wazabz่", "SkyFall"]);
  assert.notEqual(top, guilds);
});

test("names stay exact while search folding stays match-only", () => {
  assert.equal(splitName("OracIe").base, "OracIe");
  assert.equal(splitName("BNE #14F93D").base, "BNE");
  assert.equal(splitName("BNE #14F93D").id, "#14F93D");
  assert.equal(searchKey("Oracle"), searchKey("OracIe"));
  assert.equal(searchKey("Wazabz"), searchKey("Wazabz่"));
  assert.notEqual("Wazabz", "Wazabz่");
  const cyrillic = fixture.guilds.find((guild) => guild.name.startsWith("Grind"));
  assert.ok(cyrillic);
  assert.equal(searchKey("GrindSky"), searchKey(cyrillic.name));
  assert.notEqual("GrindSky", cyrillic.name);
  assert.equal(decodeRouteName("BNE%20%2314F93D"), "BNE #14F93D");
  assert.equal(decodeRouteName("OracIe"), "OracIe");
  assert.equal(decodeRouteName("Wazabz%E0%B9%88"), "Wazabz่");
});

test("deriveSiege matches the Lawolf 17 Oct sample and does not mutate it", () => {
  const result = toResult(fixture);
  const playerOrder = result.playerResults.map((player) => player.name);
  const guildOrder = result.guildResults.map((guild) => guild.name);
  for (const player of result.playerResults) {
    Object.freeze(player.kills);
    Object.freeze(player.killedBy);
    Object.freeze(player.lives);
    Object.freeze(player);
  }
  for (const guild of result.guildResults) {
    Object.freeze(guild.kills);
    Object.freeze(guild.killedBy);
    Object.freeze(guild);
  }
  Object.freeze(result.playerResults);
  Object.freeze(result.guildResults);

  const model = deriveSiege(result);

  assert.deepEqual(result.playerResults.map((player) => player.name), playerOrder);
  assert.deepEqual(result.guildResults.map((guild) => guild.name), guildOrder);
  assert.equal(model.winner?.name, "OracIe");
  assert.equal(model.margin, 103);
  assert.equal(model.share, 18);
  assert.equal(model.mvp?.name, "BNE #14F93D");
  assert.equal(model.feed.length, 1243);
  assert.equal(model.feed[0].killer, "Kalgas #89AE0");
  assert.equal(model.feed[model.feed.length - 1].killer, "Winzki #1988A8");
  assert.equal(model.timeline.minutes, 55);
  assert.equal(model.timeline.series[0].values.at(-1), 218);
  assert.equal(model.h2h["OracIe"]["Wazabz่"], 133);
  assert.deepEqual(
    model.momentum.map((block) => `${block.startLabel}–${block.endLabel} ${block.guild} ${block.kills}`),
    [
      "20:20–20:30 Wazabz่ 47",
      "20:30–20:40 OracIe 46",
      "20:40–20:50 OracIe 46",
      "20:50–21:00 OracIe 40",
      "21:00–21:10 Wazabz่ 38",
      "21:10–21:20 Aegȋs 19",
    ],
  );
  assert.equal(model.rivalries[0].aKills + model.rivalries[0].bKills >= 242, true);

  const labels = model.badges.map((badge) => `${badge.label}:${badge.player}:${badge.detail}`);
  assert.deepEqual(labels, [
    "First blood:Kalgas #89AE0:20:20:45 · on MirandaDoctrine #180012",
    "Last blood:Winzki #1988A8:21:15:10 · on Jiyooo #2D65D",
    "Killstreak:Kalgas #89AE0:22 kills in one life",
    "Shutdown:K0nG #F464F:ended Kalgas's 22-streak",
    "Executioner:BNE #14F93D:45 kills",
    "Collector:iJulZ #198F4B:27 unique targets",
    "Vendetta:未末未末 #51CC:6× Mid",
    "Untouchable:Madz #95066:33 kills, 6 deaths",
  ]);
  for (const badge of model.badges) {
    assert.equal(badge.player, fixture.badges.find((row) => row[1] === badge.label)?.[2]);
    assert.equal(badge.guild, fixture.badges.find((row) => row[1] === badge.label)?.[3]);
  }
});
