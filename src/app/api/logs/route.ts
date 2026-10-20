import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseAndProcessLog } from '../utils/parseLog';
import { getCharactersByServer } from '@/lib/character';
import { summarizeParsed } from '@/lib/summary';

// POST /api/logs - Save a new log with date
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const logDateStr = formData.get('logDate') as string;
    const serverName = formData.get('serverName') as string;

    if (!file || !logDateStr || !serverName) {
      return NextResponse.json(
        { error: 'File, log date, and server name are required' }, 
        { status: 400 }
      );
    }

    // Parse the log date string to a Date object
    const logDate = new Date(logDateStr).toISOString().split('T')[0];
    
    // Read and parse the log file
    const rawLog = await file.text();
    const parsedData = parseAndProcessLog(rawLog);

    // Get character class information for this server
    const characters = await getCharactersByServer(serverName);
    const characterClasses: Record<string, string> = {};
    
    // Create a map of character names to classes
    characters.forEach((char: any) => {
      characterClasses[char.name] = char.class;
    });

    // Enhance the parsed data with character class information
    if (parsedData && parsedData.playerResults) {
      parsedData.playerResults = parsedData.playerResults.map((player: any) => ({
        ...player,
        class: characterClasses[player.name] || '',
      }));
    }

    // Save to database
    const logEntry = await prisma.logEntry.create({
      data: {
        logDate,
        serverName,
        rawLog,
        parsedData: parsedData as any, // We need to cast to any since it's a JSON field
      },
    });

    return NextResponse.json({
      id: logEntry.id,
      logDate: logEntry.logDate,
      serverName: logEntry.serverName,
      parsedData
    });
  } catch (error) {
    console.error('Error saving log:', error);
    return NextResponse.json(
      { error: 'Failed to save log data' }, 
      { status: 500 }
    );
  }
}

// GET /api/logs - Get all available log dates
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serverName = searchParams.get('serverName');
    
    // Query conditions
    const whereClause = serverName ? { serverName } : {};
    
    // Group logs by serverName if no specific server is requested.
    // The shape stays `{ servers: [{ name, count }] }`.
    if (!serverName) {
      const logs = await prisma.logEntry.findMany({
        where: whereClause,
        select: { id: true, logDate: true, serverName: true },
        orderBy: { logDate: 'desc' },
      });
      const serverGroups = logs.reduce((acc: Record<string, { count: number }>, log: { serverName: string | null }) => {
        const server = log.serverName || 'Unknown';
        if (!acc[server]) {
          acc[server] = { count: 0 };
        }
        acc[server].count++;
        return acc;
      }, {});

      return NextResponse.json({
        servers: Object.keys(serverGroups).map(name => ({
          name,
          count: serverGroups[name].count
        }))
      });
    }

    // A server list includes a small summary so the siege index can show a winner
    // without sending the raw log or the full parse to the browser.
    const logs = await prisma.logEntry.findMany({
      where: whereClause,
      select: { id: true, logDate: true, serverName: true, createdAt: true, parsedData: true },
      orderBy: { logDate: 'desc' },
    });

    return NextResponse.json(logs.map((log) => ({
      id: log.id,
      logDate: log.logDate,
      serverName: log.serverName,
      createdAt: log.createdAt.toISOString(),
      ...summarizeParsed(log.parsedData),
    })));
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve logs' }, 
      { status: 500 }
    );
  }
}
