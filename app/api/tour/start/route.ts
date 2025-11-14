// API Route: Start Tour Session
// POST /api/tour/start

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { zoneId, userId, routeGeom } = body;

    if (!zoneId) {
      return NextResponse.json(
        { error: 'Missing required field: zoneId' },
        { status: 400 }
      );
    }

    // Verify zone exists
    const zone = await db.getZone(zoneId);
    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Create session
    const session = await db.createSession(zoneId, userId, routeGeom);

    // Get initial progression
    const progression = await db.getProgression(session.id);

    console.log(`Tour session started: ${session.id}`);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        zoneId: session.zone_id,
        startedAt: session.started_at,
        paused: session.paused,
      },
      progression: {
        total: progression.length,
        completed: 0,
        remaining: progression.length,
        segments: progression,
      },
    });
  } catch (error) {
    console.error('Error starting tour:', error);
    return NextResponse.json(
      {
        error: 'Failed to start tour',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
