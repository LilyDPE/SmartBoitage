// API Route: Zone Optimization
// POST /api/zones/optimize - Analyze and optimize a drawn zone

import { NextRequest, NextResponse } from 'next/server';
import { extractStreetsFromOSM } from '@/lib/overpass';
import { generateSegments } from '@/lib/streets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { geom } = body;

    if (!geom) {
      return NextResponse.json(
        { error: 'Missing required field: geom' },
        { status: 400 }
      );
    }

    // Extract streets from the zone
    const streets = await extractStreetsFromOSM(geom.coordinates);

    if (streets.length === 0) {
      return NextResponse.json({
        success: true,
        optimized: false,
        message: 'Aucune rue trouvée dans cette zone',
        original: geom,
        suggested: null,
        stats: {
          streetCount: 0,
          estimatedDuration: 0,
        },
      });
    }

    // Calculate statistics
    const totalLength = streets.reduce((sum, street) => {
      // Calculate length from geometry coordinates
      let length = 0;
      if (street.geometry && street.geometry.coordinates) {
        for (let i = 0; i < street.geometry.coordinates.length - 1; i++) {
          const [lon1, lat1] = street.geometry.coordinates[i];
          const [lon2, lat2] = street.geometry.coordinates[i + 1];
          // Haversine distance in meters
          const R = 6371000; // Earth's radius in meters
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

    // Estimate duration (assuming 300m per hour for door-to-door)
    const estimatedDurationMinutes = Math.round((totalLength / 300) * 60);

    // Check if zone is optimal (target: 1.5-2.5 hours)
    const targetMinMin = 90; // 1.5h
    const targetMinMax = 150; // 2.5h

    let suggestions = [];
    let optimized = true;

    if (estimatedDurationMinutes < targetMinMin) {
      suggestions.push({
        type: 'too_small',
        message: `Zone trop petite (${estimatedDurationMinutes} min). Suggérez d'agrandir pour atteindre 1h30-2h30 de boîtage.`,
        action: 'expand',
        targetExpansion: Math.round(((targetMinMin / estimatedDurationMinutes) - 1) * 100),
      });
      optimized = false;
    } else if (estimatedDurationMinutes > targetMinMax) {
      suggestions.push({
        type: 'too_large',
        message: `Zone trop grande (${Math.round(estimatedDurationMinutes / 60 * 10) / 10}h). Suggérez de réduire ou découper en plusieurs zones.`,
        action: 'split',
        suggestedSplits: Math.ceil(estimatedDurationMinutes / 120), // Target 2h per zone
      });
      optimized = false;
    }

    // Analyze street connectivity
    const disconnectedStreets = analyzeConnectivity(streets);
    if (disconnectedStreets.length > 0) {
      suggestions.push({
        type: 'disconnected',
        message: `${disconnectedStreets.length} rue(s) isolée(s) détectée(s). Cela peut augmenter le temps de trajet.`,
        action: 'review',
        streets: disconnectedStreets.map((s) => s.name).slice(0, 5),
      });
    }

    // Find dead-end streets that might be inefficient
    const deadEnds = streets.filter((s) => s.tags?.highway === 'service' || s.tags?.highway === 'residential');
    if (deadEnds.length > streets.length * 0.3) {
      suggestions.push({
        type: 'many_deadends',
        message: `${deadEnds.length} voies de service/résidentielles. Vérifiez si toutes sont nécessaires.`,
        action: 'review',
      });
    }

    return NextResponse.json({
      success: true,
      optimized,
      message: optimized
        ? 'Zone bien dimensionnée !'
        : 'Optimisations suggérées disponibles',
      original: geom,
      suggestions,
      stats: {
        streetCount: streets.length,
        totalLengthKm: Math.round(totalLength / 10) / 100,
        estimatedDurationMinutes,
        estimatedDurationHours: Math.round(estimatedDurationMinutes / 6) / 10,
        deadEnds: deadEnds.length,
        disconnected: disconnectedStreets.length,
      },
      streets: streets.map((s) => {
        // Calculate length for this street
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
        return {
          name: s.name,
          id: s.id,
          length: Math.round(length),
          highway: s.tags?.highway,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error optimizing zone:', error);
    return NextResponse.json(
      {
        error: 'Failed to optimize zone',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Analyze street connectivity
function analyzeConnectivity(streets: any[]): any[] {
  const disconnected: any[] = [];

  // Simple heuristic: check if streets share endpoints
  // In a real implementation, you'd build a graph and check for connected components
  for (const street of streets) {
    if (!street.geometry || !street.geometry.coordinates) continue;

    const coords = street.geometry.coordinates;
    const start = coords[0];
    const end = coords[coords.length - 1];

    // Check if this street connects to any other
    const hasConnection = streets.some((other) => {
      if (other === street || !other.geometry || !other.geometry.coordinates) return false;

      const otherCoords = other.geometry.coordinates;
      const otherStart = otherCoords[0];
      const otherEnd = otherCoords[otherCoords.length - 1];

      // Check if endpoints are close (within 10 meters)
      const threshold = 0.0001; // ~10m in degrees
      return (
        distance(start, otherStart) < threshold ||
        distance(start, otherEnd) < threshold ||
        distance(end, otherStart) < threshold ||
        distance(end, otherEnd) < threshold
      );
    });

    if (!hasConnection && streets.length > 1) {
      disconnected.push(street);
    }
  }

  return disconnected;
}

// Simple distance function
function distance(p1: number[], p2: number[]): number {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return Math.sqrt(dx * dx + dy * dy);
}
