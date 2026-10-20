import assert from "node:assert/strict";
import test from "node:test";
import { attendanceImpact, buildCatalog, guildBoard, guildProfile, playerProfile, rivalrySeries, searchCatalog } from "./aggregate";
import type { SiegeSource } from "./aggregate";
import { discordText } from "./share";
import type { SiegeModel } from "./siege";

function player(name: string, guild: string, points: number, kills: number, deaths: number) {
  return {
    name,
    guildName: guild,
    totalPoints: points,
    totalKills: kills,
    totalDeaths: deaths,
    rank: 9,
    class: "",
    totalKillsEachGuild: [],
    totalDeathsEachGuild: [],
    kills: [],
    killedBy: [],
    lives: [],
  };
}

function guild(name: string, points: number, kills: number, deaths: number) {
  return {
    name,
    totalPoints: points,
    totalKills: kills,
    totalDeaths: deaths,
    playerCount: 1,
    rank: 9,
    totalPointsFromKills: points,
    totalExtraLifePoints: 0,
    kills: [],
    killedBy: [],
  };
}

test("catalog keeps OracIe and does not merge Wazabz with Wazabz่", () => {
  const firstGuilds = [guild("Wazabz่", 40, 10, 4), guild("OracIe", 100, 20, 5)];
  const firstPlayers = [player("Kalgas #89AE0", "OracIe", 30, 8, 2), player("BNE #14F93D", "Wazabz่", 50, 12, 3)];
  const secondGuilds = [guild("Wazabz", 80, 15, 6), guild("OracIe", 70, 14, 7)];
  const secondPlayers = [player("BNE #14F93D", "Wazabz่", 22, 5, 1)];
  Object.freeze(firstGuilds);
  Object.freeze(firstPlayers);
  const catalog = buildCatalog([
    { id: "new", logDate: "2026-10-17", serverName: "Lawolf", parsed: { guildResults: firstGuilds, playerResults: firstPlayers } },
    { id: "old", logDate: "2026-10-10", serverName: "Lawolf", parsed: { guildResults: secondGuilds, playerResults: secondPlayers } },
  ]);
  assert.deepEqual(firstGuilds.map((item) => item.name), ["Wazabz่", "OracIe"]);
  assert.deepEqual(guildBoard(catalog.guilds, "Lawolf").map((item) => item.name), ["OracIe", "Wazabz", "Wazabz่"]);
  const oracle = catalog.guilds.find((item) => item.name === "OracIe");
  assert.equal(oracle?.wins, 1);
  assert.equal(oracle?.sieges, 2);

  const found = searchCatalog(catalog, "Oracle");
  assert.deepEqual(found.guilds.map((item) => item.name), ["OracIe"]);
  assert.equal(found.lookalike, true);
  const both = searchCatalog(catalog, "Wazabz").guilds.map((item) => item.name);
  assert.deepEqual(both.sort(), ["Wazabz", "Wazabz่"]);

  const bne = playerProfile(catalog, "BNE #14F93D", "Lawolf");
  assert.equal(bne?.points, 72);
  assert.equal(bne?.guild, "Wazabz่");
  assert.equal(bne?.appearances[0]?.date, "2026-10-17");
  assert.equal(playerProfile(catalog, "BNE #14F93D", "Mia"), null);
});

test("rivalry history keeps Wazabz and Wazabz่ apart", () => {
  const meetings: [string, string, number][] = [
    ["2026-07-11", "Wazabz่", 14],
    ["2026-07-18", "Wazabz่", 8],
    ["2026-08-08", "Wazabz่", 35],
    ["2026-08-15", "Wazabz่", 84],
    ["2026-08-29", "Wazabz", 120],
    ["2026-09-05", "Wazabz่", 63],
    ["2026-09-12", "Wazabz่", 74],
    ["2026-09-19", "Wazabz", 39],
    ["2026-09-26", "Wazabz", 71],
    ["2026-10-03", "Wazabz่", 125],
    ["2026-10-10", "Wazabz่", 52],
    ["2026-10-17", "Wazabz่", 133],
  ];
  const sources: SiegeSource[] = meetings.map(([date, opponent, kills], index) => ({
    id: `s${index}`,
    logDate: date,
    serverName: "Lawolf",
    parsed: {
      playerResults: [],
      guildResults: [
        guild("OracIe", 10, kills, 1),
        guild(opponent, 9, 1, kills),
      ].map((row, guildIndex) => ({
        ...row,
        kills: [{ name: guildIndex === 0 ? opponent : "OracIe", count: guildIndex === 0 ? kills : 1 }],
      })),
    },
  }));
  Object.freeze(sources);
  assert.deepEqual(rivalrySeries(sources, "OracIe", "Wazabz่").map((point) => point.kills), [8, 35, 84, 63, 74, 125, 52, 133]);
  assert.deepEqual(rivalrySeries(sources, "OracIe", "Wazabz").map((point) => point.kills), [120, 39, 71]);
  const profile = guildProfile(buildCatalog(sources), "OracIe", "Lawolf", sources);
  assert.equal(profile?.rival?.name, "Wazabz่");
  assert.equal(profile?.opponents.some((opponent) => opponent.name === "Wazabz"), true);
  assert.equal(profile?.opponents.some((opponent) => opponent.name === "Wazabz่"), true);
});

test("attendance K/D is the mean ratio in each fielded-size bucket", () => {
  const sized = (name: string, players: number, kills: number, deaths: number) => ({
    ...guild(name, 1, kills, deaths),
    playerCount: players,
  });
  const sources: SiegeSource[] = [{
    id: "a",
    logDate: "2026-10-17",
    serverName: "Lawolf",
    parsed: {
      playerResults: [],
      guildResults: [
        sized("OracIe", 15, 23, 20),
        sized("Wazabz่", 15, 23, 20),
        sized("Aegȋs", 14, 131, 100),
        sized("Wazabz", 9, 2, 5),
        sized("SkyFall", 15, 50, 0),
      ],
    },
  }];
  assert.deepEqual(attendanceImpact(sources), [
    { label: "15 players", guilds: 2, kd: 1.15 },
    { label: "12–14 players", guilds: 1, kd: 1.31 },
    { label: "Under 12", guilds: 1, kd: 0.4 },
  ]);
});

test("discord share text keeps stored names", () => {
  const model = {
    winner: { name: "OracIe", totalPoints: 524, totalKills: 218 },
    margin: 103,
    mvp: { name: "BNE #14F93D", guild: "Wazabz่", points: 104 },
  } as SiegeModel;
  const text = discordText(model, "Lawolf", "2026-10-17", "https://example.test/logs/1");
  assert.match(text, /OracIe/);
  assert.match(text, /Wazabz่/);
  assert.equal(text.includes("Oracle"), false);
});
