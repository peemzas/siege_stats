import { NextRequest, NextResponse } from "next/server";
import { buildCatalog, searchCatalog } from "@/lib/aggregate";
import { loadSieges } from "@/lib/loadSieges";

export async function GET(req: NextRequest) {
  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const server = new URL(req.url).searchParams.get("server") ?? "";
  if (!query) return NextResponse.json({ guilds: [], players: [], lookalike: false });
  try {
    const catalog = buildCatalog(await loadSieges(server || undefined));
    const found = searchCatalog(catalog, query, server || undefined);
    return NextResponse.json({
      lookalike: found.lookalike,
      guilds: found.guilds.map((guild) => ({
        name: guild.name,
        server: guild.server,
        sieges: guild.sieges,
        wins: guild.wins,
        points: guild.points,
      })),
      players: found.players.map((player) => ({
        name: player.name,
        server: player.server,
        guild: player.guild,
        sieges: player.sieges,
        points: player.points,
      })),
    });
  } catch (error) {
    console.error("Error searching sieges:", error);
    return NextResponse.json({ error: "Couldn't search sieges" }, { status: 500 });
  }
}
