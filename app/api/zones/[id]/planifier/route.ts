// API Route: Plan Optimized Route
// POST /api/zones/[id]/planifier

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSegmentMidpoints, getStreetMidpoints } from '@/lib/streets';
import { optimizeRoute, optimizeLargeRoute } from '@/lib/ors';
import { Position } from 'geojson';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const zoneId = params.id;
    const body = await request.json();
    const {
      startPoint,
      profile = 'foot-walking',
      saveToDb = true,
      teamSize = 1, // 1 = solo, 2 = two people (both sides at once)
    } = body;

    console.log(`Planning route for zone: ${zoneId} (team size: ${teamSize})`);

    // Get zone
    const zone = await db.getZone(zoneId);
    if (!zone) {
      return NextResponse.json(
        { error: 'Zone not found' },
        { status: 404 }
      );
    }

    let waypoints: Position[];
    let segmentIds: string[];
    let totalSegments: number;
    let streetMapping: Array<{
      streetId: string;
      streetName: string;
      segmentIds: string[];
      midpoint: Position;
      longueur: number;
    }> = [];

    if (teamSize === 2) {
      // Mode 2 personnes : optimiser par rue (les deux côtés ensemble)
      const streetData = await getStreetMidpoints(zoneId);

      if (streetData.length === 0) {
        return NextResponse.json(
          { error: 'No streets found for this zone' },
          { status: 400 }
        );
      }

      console.log(`Optimizing route for ${streetData.length} streets (2-person team)...`);

      waypoints = streetData.map((s) => s.midpoint);
      segmentIds = streetData.flatMap((s) => s.segmentIds);
      totalSegments = streetData.length;
      streetMapping = streetData;
    } else {
      // Mode 1 personne : optimiser par segment (chaque côté séparément)
      const segmentData = await getSegmentMidpoints(zoneId);

      if (segmentData.length === 0) {
        return NextResponse.json(
          { error: 'No segments found for this zone' },
          { status: 400 }
        );
      }

      console.log(`Optimizing route for ${segmentData.length} segments (solo)...`);

      waypoints = segmentData.map((s) => s.midpoint);
      segmentIds = segmentData.map((s) => s.segmentId);
      totalSegments = segmentData.length;
    }

    // If start point provided, add it to the beginning
    let allWaypoints = waypoints;
    if (startPoint && Array.isArray(startPoint) && startPoint.length === 2) {
      allWaypoints = [startPoint, ...waypoints];
    }

    // Optimize route
    let result;
    try {
      if (allWaypoints.length > 50) {
        // Use chunked optimization for large routes
        result = await optimizeLargeRoute(allWaypoints, profile);
      } else {
        result = await optimizeRoute(
          allWaypoints,
          profile,
          startPoint ? 0 : undefined
        );
      }
    } catch (error) {
      console.error('Error optimizing route with ORS:', error);
      return NextResponse.json(
        {
          error: 'Failed to optimize route',
          details: String(error),
        },
        { status: 500 }
      );
    }

    console.log(
      `Route optimized: ${result.totalDistance.toFixed(0)}m, ${result.totalDuration.toFixed(0)}s`
    );

    // Update segment order based on optimization
    const startOffset = startPoint ? 1 : 0;
    const orderedSegmentIds: string[] = [];

    if (teamSize === 2) {
      // Mode 2 personnes : assigner même ordre aux deux côtés de chaque rue
      for (let i = startOffset; i < result.segmentOrder.length; i++) {
        const originalIndex = result.segmentOrder[i] - startOffset;
        if (originalIndex >= 0 && originalIndex < streetMapping.length) {
          const street = streetMapping[originalIndex];
          // Add all segments of this street
          orderedSegmentIds.push(...street.segmentIds);
        }
      }
    } else {
      // Mode 1 personne : ordre standard segment par segment
      for (let i = startOffset; i < result.segmentOrder.length; i++) {
        const originalIndex = result.segmentOrder[i] - startOffset;
        if (originalIndex >= 0 && originalIndex < segmentIds.length) {
          orderedSegmentIds.push(segmentIds[originalIndex]);
        }
      }
    }

    // Update ordre_visite for each segment
    for (let i = 0; i < orderedSegmentIds.length; i++) {
      await db.updateSegmentOrder(orderedSegmentIds[i], i + 1);
    }

    console.log('Segment visit order updated');

    // Save optimized route to database
    if (saveToDb) {
      await db.saveRoute(
        zoneId,
        result.route,
        result.orderedWaypoints,
        result.totalDistance,
        result.totalDuration,
        result.instructions
      );
    }

    return NextResponse.json({
      success: true,
      route: {
        geometry: result.route,
        waypoints: result.orderedWaypoints,
        distance: result.totalDistance,
        duration: result.totalDuration,
        segmentOrder: orderedSegmentIds,
      },
      stats: {
        totalSegments,
        totalDistance: `${(result.totalDistance / 1000).toFixed(2)} km`,
        estimatedDuration: `${Math.round(result.totalDuration / 60)} minutes`,
      },
    });
  } catch (error) {
    console.error('Error planning route:', error);
    return NextResponse.json(
      {
        error: 'Failed to plan route',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
