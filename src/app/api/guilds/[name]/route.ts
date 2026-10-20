import { NextRequest, NextResponse } from "next/server";
import { buildCatalog, guildProfile } from "@/lib/aggregate";
import { loadSieges } from "@/lib/loadSieges";
import { decodeRouteName } from "@/lib/names";

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const server = new URL(req.url).searchParams.get("server") ?? "";
  if (!server) return NextResponse.json({ error: "Server is required" }, { status: 400 });
  try {
    const profile = guildProfile(buildCatalog(await loadSieges(server)), decodeRouteName(params.name), server);
    if (!profile) return NextResponse.json({ error: "Guild not found" }, { status: 404 });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error loading guild:", error);
    return NextResponse.json({ error: "Couldn't load guild" }, { status: 500 });
  }
}
