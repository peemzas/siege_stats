import { prisma } from "./prisma";
import type { SiegeSource } from "./aggregate";

export async function loadSieges(serverName?: string): Promise<SiegeSource[]> {
  const logs = await prisma.logEntry.findMany({
    where: serverName ? { serverName } : {},
    select: { id: true, logDate: true, serverName: true, parsedData: true },
    orderBy: { logDate: "desc" },
  });
  return logs.map((log) => ({
    id: log.id,
    logDate: log.logDate,
    serverName: log.serverName,
    parsed: log.parsedData,
  }));
}
