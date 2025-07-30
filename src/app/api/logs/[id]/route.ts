import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCharactersByServer } from '@/lib/character';

// GET /api/logs/[id] - Get a specific log by date or ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Try to find by ID directly
    const logEntry = await prisma.logEntry.findUnique({
      where: {
        id,
      },
    });

    if (!logEntry) {
      return NextResponse.json(
        { error: 'No log found with the specified ID' },
        { status: 404 }
      );
    }

    return NextResponse.json(logEntry);
  } catch (error) {
    console.error('Error retrieving log:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve log data' },
      { status: 500 }
    );
  }
}
