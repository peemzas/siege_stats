import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/logs/[id] - Get a specific log by date or ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idParam = params.id;
    
    // Check if the ID is a valid date
    const isDate = !isNaN(Date.parse(idParam));
    
    if (isDate) {
      // Parse the date string and create date range for that day
      const targetDate = new Date(idParam);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Find logs from that date
      const logEntry = await prisma.logEntry.findFirst({
        where: {
          logDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (!logEntry) {
        return NextResponse.json(
          { error: 'No log found for the specified date' },
          { status: 404 }
        );
      }

      return NextResponse.json(logEntry);
    } else {
      // Try to find by ID directly
      const logEntry = await prisma.logEntry.findUnique({
        where: {
          id: idParam,
        },
      });

      if (!logEntry) {
        return NextResponse.json(
          { error: 'No log found with the specified ID' },
          { status: 404 }
        );
      }

      return NextResponse.json(logEntry);
    }
  } catch (error) {
    console.error('Error retrieving log:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve log data' },
      { status: 500 }
    );
  }
}
