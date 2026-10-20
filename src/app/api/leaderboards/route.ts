import { NextRequest, NextResponse } from "next/server";
import { buildCatalog, guildBoard, playerBoard, serverSpan } from "@/lib/aggregate";
import { loadSieges } from "@/lib/loadSieges";

export async function GET(req: NextRequest) {
  const server = new URL(req.url).searchParams.get("server") ?? "";
  if (!server) return NextResponse.json({ error: "Server is required" }, { status: 400 });
  try {
    const sources = await loadSieges(server);
    const catalog = buildCatalog(sources);
    const span = serverSpan(sources, server);
    return NextResponse.json({
      server,
      sieges: span.count,
      from: span.from,
      to: span.to,
      players: playerBoard(catalog.players, server).slice(0, 50).map((player) => ({
        name: player.name,
        guild: player.guild,
        sieges: player.sieges,
        points: player.points,
        kills: player.kills,
        deaths: player.deaths,
        mvps: player.mvps,
      })),
      guilds: guildBoard(catalog.guilds, server).map((guild) => ({
        name: guild.name,
        sieges: guild.sieges,
        wins: guild.wins,
        points: guild.points,
        avgPlace: Number(guild.avgPlace.toFixed(2)),
        form: [...guild.appearances].reverse().slice(-8).map((row) => row.place),
      })),
    });
  } catch (error) {
    console.error("Error building leaderboards:", error);
    return NextResponse.json({ error: "Couldn't load leaderboards" }, { status: 500 });
  }
}
