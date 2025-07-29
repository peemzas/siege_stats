import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseAndProcessLog } from '../upload/route';

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
    
    // Get all logs or filter by serverName if provided
    const logs = await prisma.logEntry.findMany({
      where: whereClause,
      select: {
        id: true,
        logDate: true,
        serverName: true,
      },
      orderBy: {
        logDate: 'desc',
      },
    });

    // Group logs by serverName if no specific server is requested
    if (!serverName) {
      const serverGroups = logs.reduce((acc: Record<string, { count: number }>, log: any) => {
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
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve logs' }, 
      { status: 500 }
    );
  }
}
