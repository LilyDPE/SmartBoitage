// API Route: Quick Tour Generation
// POST /api/quick-tour - Generate optimal tour based on current location and available time

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { haversineDistance } from '@/lib/geo';
import { optimizeRoute } from '@/lib/ors';
import { Position } from 'geojson';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lon,
      lat,
      durationMinutes = 60, // Default: 1 hour
      maxRadius = 2000, // Search radius in meters (default: 2km)
      profile = 'foot-walking',
    } = body;

    if (!lon || !lat) {
      return NextResponse.json(
        { error: 'Position (lon, lat) is required' },
        { status: 400 }
      );
    }

    console.log(`Generating quick tour: ${durationMinutes}min from [${lon}, ${lat}]`);

    // Step 1: Find nearby segments that haven't been completed
    const nearbySegments = await findNearbyUncompletedSegments(lon, lat, maxRadius);

    if (nearbySegments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Aucun segment disponible à proximité',
        segments: [],
      });
    }

    console.log(`Found ${nearbySegments.length} nearby segments`);

    // Step 2: Calculate how many segments fit in the available time
    // Walking speed: 2500m/h for door-to-door
    const walkingSpeedMps = 2500 / 3600; // meters per second
    const availableTimeSeconds = durationMinutes * 60;

    // Reserve 20% for walking between segments and returning to start
    const effectiveTimeSeconds = availableTimeSeconds * 0.8;

    // Sort segments by distance from start point
    const segmentsWithDistance = nearbySegments.map((seg) => {
      const midpoint = seg.midpoint;
      const distance = haversineDistance(lon, lat, midpoint[0], midpoint[1]);
      return { ...seg, distanceFromStart: distance };
    });

    segmentsWithDistance.sort((a, b) => a.distanceFromStart - b.distanceFromStart);

    // Select segments that fit in time budget
    let totalDistance = 0;
    let selectedSegments: any[] = [];

    for (const seg of segmentsWithDistance) {
      const segmentLength = seg.longueur_m || 0;
      const estimatedTime = segmentLength / walkingSpeedMps;

      if (totalDistance + segmentLength < effectiveTimeSeconds * walkingSpeedMps) {
        selectedSegments.push(seg);
        totalDistance += segmentLength;
      }

      // Limit to 40 segments for ORS optimization
      if (selectedSegments.length >= 40) break;
    }

    if (selectedSegments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Temps insuffisant pour compléter des segments',
        segments: [],
      });
    }

    console.log(`Selected ${selectedSegments.length} segments for ${durationMinutes}min tour`);

    // Step 3: Create waypoints (start + segment midpoints + return to start)
    const waypoints: Position[] = [[lon, lat]]; // Start point

    for (const seg of selectedSegments) {
      waypoints.push(seg.midpoint);
    }

    waypoints.push([lon, lat]); // Return to start (circular route)

    // Step 4: Optimize the route
    let optimizedRoute;
    try {
      optimizedRoute = await optimizeRoute(waypoints, profile, 0); // Start from position 0 (user location)
    } catch (error) {
      console.error('Error optimizing route:', error);
      return NextResponse.json(
        {
          error: 'Failed to optimize route',
          details: String(error),
        },
        { status: 500 }
      );
    }

    // Step 5: Calculate actual tour statistics
    const totalDurationMinutes = Math.round(optimizedRoute.totalDuration / 60);
    const totalDistanceKm = (optimizedRoute.totalDistance / 1000).toFixed(2);

    // Map optimized order back to segments (excluding start/end points)
    const orderedSegments = optimizedRoute.segmentOrder
      .slice(1, -1) // Remove start and end points
      .map((idx) => selectedSegments[idx - 1])
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      tour: {
        startPoint: [lon, lat],
        segments: orderedSegments,
        route: optimizedRoute.route,
        instructions: optimizedRoute.instructions,
        waypoints: optimizedRoute.orderedWaypoints,
      },
      stats: {
        segmentCount: orderedSegments.length,
        totalDistance: `${totalDistanceKm} km`,
        totalDuration: `${totalDurationMinutes} min`,
        requestedDuration: `${durationMinutes} min`,
        efficiency: totalDurationMinutes <= durationMinutes ? 'optimal' : 'over-budget',
      },
      message: `Itinéraire de ${totalDurationMinutes}min généré avec ${orderedSegments.length} segments`,
    });
  } catch (error: any) {
    console.error('Error generating quick tour:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate quick tour',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Find uncompleted segments within radius of a point
 */
async function findNearbyUncompletedSegments(
  lon: number,
  lat: number,
  radiusMeters: number
): Promise<any[]> {
  const result = await db.query(
    `SELECT
       s.id,
       s.zone_id,
       s.street_nom,
       s.cote,
       s.longueur_m,
       ST_AsGeoJSON(s.geom)::json as geom,
       ST_AsGeoJSON(ST_LineInterpolatePoint(s.geom, 0.5))::json as midpoint_geom,
       ST_Distance(
         ST_Transform(s.geom, 3857),
         ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857)
       ) as distance_m,
       z.nom as zone_nom
     FROM segments s
     JOIN zones z ON z.id = s.zone_id
     LEFT JOIN sessions ses ON ses.zone_id = s.zone_id AND ses.statut = 'en_cours'
     WHERE s.fait = false
       AND ST_DWithin(
         ST_Transform(s.geom, 3857),
         ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857),
         $3
       )
     ORDER BY distance_m ASC
     LIMIT 100`,
    [lon, lat, radiusMeters]
  );

  return result.rows.map((row) => ({
    id: row.id,
    zone_id: row.zone_id,
    zone_nom: row.zone_nom,
    street_nom: row.street_nom,
    cote: row.cote,
    longueur_m: row.longueur_m,
    geom: row.geom,
    midpoint: row.midpoint_geom.coordinates,
    distance_m: parseFloat(row.distance_m),
  }));
}
