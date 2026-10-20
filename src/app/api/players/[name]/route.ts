import { NextRequest, NextResponse } from "next/server";
import { buildCatalog, playerProfile } from "@/lib/aggregate";
import { loadSieges } from "@/lib/loadSieges";
import { decodeRouteName } from "@/lib/names";

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const server = new URL(req.url).searchParams.get("server") ?? "";
  if (!server) return NextResponse.json({ error: "Server is required" }, { status: 400 });
  try {
    const profile = playerProfile(buildCatalog(await loadSieges(server)), decodeRouteName(params.name), server);
    if (!profile) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error loading player:", error);
    return NextResponse.json({ error: "Couldn't load player" }, { status: 500 });
  }
}
