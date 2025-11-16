// API Route: Automatic Zone Splitting
// POST /api/zones/auto-split - Split a large zone into optimal sub-zones

import { NextRequest, NextResponse } from 'next/server';
import { extractStreetsFromOSM } from '@/lib/overpass';

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
    const streets = await extractStreetsFromOSM(geom.coordinates);

    if (streets.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucune rue trouvée dans cette zone',
      });
    }

    // Calculate total length and estimated duration
    const totalLength = streets.reduce((sum, street) => {
      let length = 0;
      if (street.geometry && street.geometry.coordinates) {
        for (let i = 0; i < street.geometry.coordinates.length - 1; i++) {
          const [lon1, lat1] = street.geometry.coordinates[i];
          const [lon2, lat2] = street.geometry.coordinates[i + 1];
          const R = 6371000;
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          length += R * c;
        }
      }
      return sum + length;
    }, 0);
    // Estimate duration (assuming 1500m per hour for door-to-door in urban areas)
    const totalDurationMinutes = Math.round((totalLength / 1500) * 60);

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
      const zoneLength = zone.streets.reduce((sum: number, s: any) => {
        let length = 0;
        if (s.geometry && s.geometry.coordinates) {
          for (let i = 0; i < s.geometry.coordinates.length - 1; i++) {
            const [lon1, lat1] = s.geometry.coordinates[i];
            const [lon2, lat2] = s.geometry.coordinates[i + 1];
            const R = 6371000;
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLon = ((lon2 - lon1) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            length += R * c;
          }
        }
        return sum + length;
      }, 0);
      const zoneDuration = Math.round((zoneLength / 1500) * 60);

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
    if (street.geometry && street.geometry.coordinates) {
      allCoords.push(...street.geometry.coordinates);
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
        if (!street.geometry || !street.geometry.coordinates) return false;

        // Check if any coordinate is within the cell
        return street.geometry.coordinates.some((coord: number[]) => {
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
    zones.flatMap((z) => z.streets.map((s: any) => s.id))
  );

  const unassignedStreets = streets.filter(
    (s) => !assignedStreetIds.has(s.id)
  );

  if (unassignedStreets.length > 0 && zones.length > 0) {
    // Add to zone with least total length
    const zoneLengths = zones.map((z) =>
      z.streets.reduce((sum: number, s: any) => {
        let length = 0;
        if (s.geometry && s.geometry.coordinates) {
          for (let i = 0; i < s.geometry.coordinates.length - 1; i++) {
            const [lon1, lat1] = s.geometry.coordinates[i];
            const [lon2, lat2] = s.geometry.coordinates[i + 1];
            const R = 6371000;
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLon = ((lon2 - lon1) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            length += R * c;
          }
        }
        return sum + length;
      }, 0)
    );
    const minIndex = zoneLengths.indexOf(Math.min(...zoneLengths));
    zones[minIndex].streets.push(...unassignedStreets);
  }

  return zones;
}
