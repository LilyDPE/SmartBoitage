// API Route: Admin Statistics
// GET /api/admin/stats - Get system-wide statistics

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    await requireAdmin(session);

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30'; // days

    // Get overall statistics
    const overallStats = await query(`
      SELECT
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'commercial') as total_commercials,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'commercial' AND u.actif) as active_commercials,
        COUNT(DISTINCT z.id) as total_zones,
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT sh.id) FILTER (WHERE sh.ended_at IS NOT NULL) as completed_sessions,
        SUM(sh.completed_segments) as total_segments_completed,
        SUM(sh.distance_m) as total_distance_m,
        ROUND(AVG(sh.duration_seconds)) as avg_session_duration
      FROM users u
      CROSS JOIN zones_boitage z
      CROSS JOIN sessions s
      LEFT JOIN session_history sh ON true
      WHERE sh.started_at >= NOW() - INTERVAL '${parseInt(period)} days'
    `);

    // Get daily activity for period
    const dailyActivity = await query(`
      SELECT * FROM v_daily_activity
      WHERE date >= CURRENT_DATE - INTERVAL '${parseInt(period)} days'
      ORDER BY date DESC
      LIMIT 30
    `);

    // Get user performance
    const userPerformance = await query(`
      SELECT * FROM v_user_performance
      ORDER BY total_segments_completed DESC
      LIMIT 20
    `);

    // Get zone popularity
    const zonePopularity = await query(`
      SELECT * FROM v_zone_popularity
      LIMIT 20
    `);

    // Get recent activity
    const recentActivity = await query(`
      SELECT
        a.action,
        a.entity_type,
        a.user_email,
        a.created_at,
        a.details
      FROM activity_log a
      ORDER BY a.created_at DESC
      LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      stats: overallStats.rows[0],
      dailyActivity: dailyActivity.rows,
      userPerformance: userPerformance.rows,
      zonePopularity: zonePopularity.rows,
      recentActivity: recentActivity.rows,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch statistics',
      },
      { status: error.message === 'Non authentifié' ? 401 : error.message.includes('administrateur') ? 403 : 500 }
    );
  }
}
