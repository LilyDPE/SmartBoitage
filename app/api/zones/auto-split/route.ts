// API Route: Automatic Zone Splitting
// POST /api/zones/auto-split - Split a large zone into optimal sub-zones

import { NextRequest, NextResponse } from 'next/server';
import { extractStreetsFromPolygon } from '@/lib/overpass';
import { calculatePolygonArea, createBoundingBox } from '@/lib/geo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geom, targetDurationMinutes = 120, cityName } = body;

    if (!geom) {
      return NextResponse.json(
        { error: 'Missing required field: geom' },
        { status: 400 }
      );
    }

    // Extract all streets from the large zone
    const streets = await extractStreetsFromPolygon(geom);

    if (streets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucune rue trouvée dans cette zone',
      });
    }

    // Calculate total length and estimated duration
    const totalLength = streets.reduce(
      (sum, street) => sum + (street.length || 0),
      0
    );
    const totalDurationMinutes = Math.round((totalLength / 300) * 60);

    // Determine number of zones needed
    const numZones = Math.ceil(totalDurationMinutes / targetDurationMinutes);

    if (numZones <= 1) {
      return NextResponse.json({
        success: true,
        needsSplit: false,
        message: 'Zone déjà optimale, aucun découpage nécessaire',
        stats: {
          totalStreets: streets.length,
          totalLengthKm: Math.round(totalLength / 10) / 100,
          totalDurationMinutes,
          suggestedZones: 1,
        },
      });
    }

    // Split streets into clusters using simple grid-based approach
    const zones = splitStreetsIntoZones(streets, numZones, cityName || 'Zone');

    // Calculate statistics for each zone
    const zonesWithStats = zones.map((zone, index) => {
      const zoneLength = zone.streets.reduce(
        (sum, s) => sum + (s.length || 0),
        0
      );
      const zoneDuration = Math.round((zoneLength / 300) * 60);

      return {
        id: `zone_${index + 1}`,
        name: zone.name,
        geom: zone.geom,
        streets: zone.streets.length,
        lengthKm: Math.round(zoneLength / 10) / 100,
        estimatedDurationMinutes: zoneDuration,
        estimatedDurationHours: Math.round(zoneDuration / 6) / 10,
        bounds: zone.bounds,
      };
    });

    return NextResponse.json({
      success: true,
      needsSplit: true,
      message: `${cityName || 'Cette zone'} devrait être découpée en ${numZones} zones pour optimiser le boîtage`,
      originalStats: {
        totalStreets: streets.length,
        totalLengthKm: Math.round(totalLength / 10) / 100,
        totalDurationMinutes,
        totalDurationHours: Math.round(totalDurationMinutes / 6) / 10,
      },
      suggestedZones: zonesWithStats,
      recommendations: [
        `Chaque zone représente environ ${targetDurationMinutes} minutes de boîtage`,
        `Cela permet de compléter une zone par demi-journée`,
        `Vous pouvez ajuster les limites manuellement si nécessaire`,
      ],
    });
  } catch (error: any) {
    console.error('Error splitting zone:', error);
    return NextResponse.json(
      {
        error: 'Failed to split zone',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Split streets into zones using grid-based clustering
function splitStreetsIntoZones(
  streets: any[],
  numZones: number,
  baseName: string
): any[] {
  // Calculate bounding box of all streets
  const allCoords: number[][] = [];
  streets.forEach((street) => {
    if (street.geom && street.geom.coordinates) {
      allCoords.push(...street.geom.coordinates);
    }
  });

  if (allCoords.length === 0) {
    return [];
  }

  const minLon = Math.min(...allCoords.map((c) => c[0]));
  const maxLon = Math.max(...allCoords.map((c) => c[0]));
  const minLat = Math.min(...allCoords.map((c) => c[1]));
  const maxLat = Math.max(...allCoords.map((c) => c[1]));

  // Determine grid dimensions (try to make it roughly square)
  const cols = Math.ceil(Math.sqrt(numZones));
  const rows = Math.ceil(numZones / cols);

  const lonStep = (maxLon - minLon) / cols;
  const latStep = (maxLat - minLat) / rows;

  const zones: any[] = [];

  // Create grid cells
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (zones.length >= numZones) break;

      const cellMinLon = minLon + col * lonStep;
      const cellMaxLon = minLon + (col + 1) * lonStep;
      const cellMinLat = minLat + row * latStep;
      const cellMaxLat = minLat + (row + 1) * latStep;

      // Find streets in this cell
      const cellStreets = streets.filter((street) => {
        if (!street.geom || !street.geom.coordinates) return false;

        // Check if any coordinate is within the cell
        return street.geom.coordinates.some((coord: number[]) => {
          return (
            coord[0] >= cellMinLon &&
            coord[0] <= cellMaxLon &&
            coord[1] >= cellMinLat &&
            coord[1] <= cellMaxLat
          );
        });
      });

      if (cellStreets.length > 0) {
        // Create polygon for this zone
        const zonePolygon = {
          type: 'Polygon',
          coordinates: [
            [
              [cellMinLon, cellMinLat],
              [cellMaxLon, cellMinLat],
              [cellMaxLon, cellMaxLat],
              [cellMinLon, cellMaxLat],
              [cellMinLon, cellMinLat],
            ],
          ],
        };

        zones.push({
          name: `${baseName} - Secteur ${zones.length + 1}`,
          geom: zonePolygon,
          streets: cellStreets,
          bounds: {
            minLon: cellMinLon,
            maxLon: cellMaxLon,
            minLat: cellMinLat,
            maxLat: cellMaxLat,
          },
        });
      }
    }
  }

  // If we have unassigned streets (due to grid overlap), assign them to nearest zone
  const assignedStreetIds = new Set(
    zones.flatMap((z) => z.streets.map((s: any) => s.osmId || s.id))
  );

  const unassignedStreets = streets.filter(
    (s) => !assignedStreetIds.has(s.osmId || s.id)
  );

  if (unassignedStreets.length > 0 && zones.length > 0) {
    // Add to zone with least total length
    const zoneLengths = zones.map((z) =>
      z.streets.reduce((sum: number, s: any) => sum + (s.length || 0), 0)
    );
    const minIndex = zoneLengths.indexOf(Math.min(...zoneLengths));
    zones[minIndex].streets.push(...unassignedStreets);
  }

  return zones;
}
