// API Route: Update Tour Progress
// POST /api/tour/update

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { detectCurrentSegment } from '@/lib/streets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, lon, lat, segmentId, action } = body;

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

    if (session.ended_at) {
      return NextResponse.json(
        { error: 'Session has already ended' },
        { status: 400 }
      );
    }

    // Update session position if GPS coordinates provided
    if (lon !== undefined && lat !== undefined) {
      await db.updateSessionPosition(sessionId, lon, lat);
    }

    let detectedSegment = null;

    // Auto-detect segment based on GPS position
    if (lon !== undefined && lat !== undefined) {
      detectedSegment = await detectCurrentSegment(sessionId, lon, lat, 15);

      if (detectedSegment) (

        // Auto-start segment if not already started
        await db.startSegment(sessionId, detectedSegment.id!);

        console.log(
          `User detected on segment: ${detectedSegment.streetNom} (${detectedSegment.cote})`
        );
      }
    }

    // Handle explicit actions
    if (action && segmentId) {
      if (action === 'complete') {
        await db.completeSegment(sessionId, segmentId);
        console.log(`Segment ${segmentId} marked as completed`);
      } else if (action === 'start') {
        await db.startSegment(sessionId, segmentId);
        console.log(`Segment ${segmentId} marked as started`);
      }
    }

    // Get updated progression
    const progression = await db.getProgression(sessionId);
    const completed = progression.filter((p) => p.fait).length;
    const total = progression.length;

    // Get session stats
    const stats = await db.getSessionStats(sessionId);

    return NextResponse.json({
      success: true,
      currentSegment: detectedSegment,
      progression: {
        total,
        completed,
        remaining: total - completed,
        percentage: Math.round((completed / total) * 100),
      },
      stats,
      segments: progression,
    });
  } catch (error) {
    console.error('Error updating tour:', error);
    return NextResponse.json(
      {
        error: 'Failed to update tour',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    const session = await db.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const progression = await db.getProgression(sessionId);
    const stats = await db.getSessionStats(sessionId);

    const completed = progression.filter((p) => p.fait).length;
    const total = progression.length;

    return NextResponse.json({
      success: true,
      session,
      progression: {
        total,
        completed,
        remaining: total - completed,
        percentage: Math.round((completed / total) * 100),
        segments: progression,
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching tour status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tour status',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
