import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalog, guildBoard, playerProfile, searchCatalog } from "./aggregate";
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
