// API Route: Live Tour Tracking for Admin
// GET /api/admin/live-tours - Fetch all active tours with real-time positions

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès réservé aux administrateurs' },
        { status: 403 }
      );
    }

    // Fetch all active tour sessions with user info and current position
    const result = await db.query(
      `SELECT
         s.id as session_id,
         s.zone_id,
         s.statut,
         s.debut,
         s.derniere_position,
         s.updated_at,
         z.nom as zone_nom,
         u.id as user_id,
         u.name as user_name,
         u.email as user_email,
         u.role as user_role,
         -- Count segments
         (SELECT COUNT(*) FROM segments seg WHERE seg.zone_id = s.zone_id) as total_segments,
         (SELECT COUNT(*) FROM segments seg WHERE seg.zone_id = s.zone_id AND seg.fait = true) as completed_segments,
         -- Get last position coordinates
         ST_X(s.derniere_position) as lon,
         ST_Y(s.derniere_position) as lat
       FROM sessions s
       JOIN zones z ON z.id = s.zone_id
       JOIN users u ON u.id = s.user_id
       WHERE s.statut = 'en_cours'
       ORDER BY s.debut DESC`
    );

    const activeTours = result.rows.map((row) => ({
      sessionId: row.session_id,
      zoneId: row.zone_id,
      zoneName: row.zone_nom,
      status: row.statut,
      startTime: row.debut,
      lastUpdate: row.updated_at,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        role: row.user_role,
      },
      position: row.lon && row.lat ? {
        lon: parseFloat(row.lon),
        lat: parseFloat(row.lat),
      } : null,
      progress: {
        total: parseInt(row.total_segments),
        completed: parseInt(row.completed_segments),
        remaining: parseInt(row.total_segments) - parseInt(row.completed_segments),
        percentage: row.total_segments > 0
          ? Math.round((parseInt(row.completed_segments) / parseInt(row.total_segments)) * 100)
          : 0,
      },
      // Calculate elapsed time in minutes
      elapsedMinutes: row.debut
        ? Math.round((new Date().getTime() - new Date(row.debut).getTime()) / 60000)
        : 0,
    }));

    return NextResponse.json({
      success: true,
      tours: activeTours,
      count: activeTours.length,
    });
  } catch (error: any) {
    console.error('Error fetching live tours:', error);
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des tournées en cours',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
