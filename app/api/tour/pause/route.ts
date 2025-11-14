// API Route: Pause Tour Session
// POST /api/tour/pause

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, lon, lat } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    // Get session
    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update position if provided
    if (lon !== undefined && lat !== undefined) {
      await db.updateSessionPosition(sessionId, lon, lat);
    }

    // Pause session
    await db.pauseSession(sessionId);

    console.log(`Session ${sessionId} paused`);

    // Get current stats
    const stats = await db.getSessionStats(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session paused successfully',
      sessionId,
      stats,
    });
  } catch (error) {
    console.error('Error pausing tour:', error);
    return NextResponse.json(
      {
        error: 'Failed to pause tour',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
