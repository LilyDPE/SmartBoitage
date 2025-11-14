// API Route: Session History
// GET /api/admin/history - Get session history (admin/manager)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireManager } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    await requireManager(session);

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const zoneId = searchParams.get('zoneId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let sql = `
      SELECT
        sh.id,
        sh.session_id,
        sh.user_id,
        u.nom as user_nom,
        u.email as user_email,
        sh.zone_id,
        sh.zone_nom,
        sh.started_at,
        sh.ended_at,
        sh.duration_seconds,
        sh.total_segments,
        sh.completed_segments,
        sh.distance_m,
        sh.adresse_depart,
        sh.adresse_fin,
        sh.commentaire,
        sh.meteo,
        sh.temperature,
        ROUND((sh.completed_segments::FLOAT / NULLIF(sh.total_segments, 0) * 100)::NUMERIC, 1) as completion_rate
      FROM session_history sh
      LEFT JOIN users u ON sh.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      sql += ` AND sh.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (zoneId) {
      sql += ` AND sh.zone_id = $${paramIndex++}`;
      params.push(zoneId);
    }

    if (startDate) {
      sql += ` AND sh.started_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND sh.ended_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY sh.started_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM session_history sh WHERE 1=1`;
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (userId) {
      countSql += ` AND sh.user_id = $${countParamIndex++}`;
      countParams.push(userId);
    }

    if (zoneId) {
      countSql += ` AND sh.zone_id = $${countParamIndex++}`;
      countParams.push(zoneId);
    }

    if (startDate) {
      countSql += ` AND sh.started_at >= $${countParamIndex++}`;
      countParams.push(startDate);
    }

    if (endDate) {
      countSql += ` AND sh.ended_at <= $${countParamIndex++}`;
      countParams.push(endDate);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      success: true,
      history: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch history',
      },
      { status: error.message === 'Non authentifié' ? 401 : error.message.includes('manager') ? 403 : 500 }
    );
  }
}
