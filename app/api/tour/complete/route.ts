// API Route: Complete Tour Session
// POST /api/tour/complete

import { NextRequest, NextResponse } from 'next/server';
import { db, query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, commentaire, meteo, temperature } = body;

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

    // Update session with end time and optional metadata
    await query(
      `UPDATE sessions
       SET ended_at = NOW(),
           commentaire = $1,
           meteo = $2,
           temperature = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [commentaire || null, meteo || null, temperature || null, sessionId]
    );

    // Archive session to history
    await query(
      `SELECT fn_archive_session($1)`,
      [sessionId]
    );

    console.log(`Session ${sessionId} completed and archived`);

    // Get final stats
    const stats = await db.getSessionStats(sessionId);

    return NextResponse.json({
      success: true,
      message: 'Session terminée avec succès',
      sessionId,
      stats,
    });
  } catch (error) {
    console.error('Error completing tour:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete tour',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
