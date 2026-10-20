import { ImageResponse } from "next/og";
import { formatInt, formatSiegeDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deriveSiege } from "@/lib/siege";
import { readResult } from "@/lib/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Siege result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const log = await prisma.logEntry.findUnique({
    where: { id: params.id },
    select: { logDate: true, serverName: true, parsedData: true },
  });
  const result = log ? readResult(log.parsedData) : null;
  const model = result ? deriveSiege(result) : null;
  const winner = model?.winner?.name || "Siege";
  const server = log?.serverName || "";
  const date = log ? formatSiegeDate(log.logDate) : "";
  const mvp = model?.mvp;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0f16",
          color: "#e8ebf2",
          padding: "64px",
        }}
      >
        <div style={{ display: "flex", color: "#f5c451", fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
          SIEGESTATS · {server.toUpperCase()} · {date.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 800 }}>👑 {winner}</div>
          <div style={{ display: "flex", color: "#8b95a8", fontSize: 32, marginTop: 12 }}>
            {formatInt(model?.winner?.totalPoints ?? 0)} pts · +{formatInt(model?.margin ?? 0)} margin · {formatInt(model?.winner?.totalKills ?? 0)} kills
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 32 }}>
          {mvp ? `MVP ${mvp.name} · ${mvp.guild}` : "No result stored"}
        </div>
      </div>
    ),
    { ...size },
  );
}
