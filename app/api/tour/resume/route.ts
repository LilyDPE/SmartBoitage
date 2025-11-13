// API Route: Resume Tour Session
// POST /api/tour/resume

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRemainingSegments } from '@/lib/streets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

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

    if (!session.paused) {
      return NextResponse.json(
        { message: 'Session is not paused' },
        { status: 200 }
      );
    }

    // Resume session
    await db.resumeSession(sessionId);

    console.log(`Session ${sessionId} resumed`);

    // Get remaining segments
    const remainingSegments = await getRemainingSegments(sessionId);

    // Get progression
    const progression = await db.getProgression(sessionId);
    const completed = progression.filter((p) => p.fait).length;
    const total = progression.length;

    // Get stats
    const stats = await db.getSessionStats(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session resumed successfully',
      sessionId,
      lastPosition: session.last_position,
      progression: {
        total,
        completed,
        remaining: total - completed,
        percentage: Math.round((completed / total) * 100),
      },
      remainingSegments,
      stats,
    });
  } catch (error) {
    console.error('Error resuming tour:', error);
    return NextResponse.json(
      {
        error: 'Failed to resume tour',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
