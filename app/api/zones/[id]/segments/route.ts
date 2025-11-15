// API Route: Get Zone Segments
// GET /api/zones/[id]/segments

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSegmentStats } from '@/lib/streets';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const zoneId = params.id;

    // Get zone details
    const zone = await db.getZone(zoneId);

    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    // Get segments
    const segments = await db.getSegments(zoneId);

    // Get statistics
    const stats = await getSegmentStats(zoneId);

    return NextResponse.json({
      success: true,
      zone,
      segments,
      stats,
    });
  } catch (error) {
    console.error('Error fetching segments:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch segments',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
