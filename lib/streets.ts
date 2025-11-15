// Street Segmentation Logic
// Split streets into pair/impair (even/odd) sides for distribution

import { Position, LineString } from 'geojson';
import { query } from './db';
import {
  OSMStreet,
  extractHouseNumbers,
  groupByParity,
  hasHouseNumberData,
} from './overpass';
import { offsetLine, calculateLineLength } from './geo';

export interface StreetSegment {
  id?: string;
  streetId: string;
  cote: 'pair' | 'impair' | 'both';
  geometry: LineString;
  longueurM: number;
  ordreVisite?: number;
  streetNom?: string;
}

/**
 * Generate pair/impair segments for a street
 * Uses house number data if available, otherwise creates offset lines
 */
export async function generateSegments(
  street: OSMStreet,
  zoneId: string,
  streetDbId: string
): Promise<StreetSegment[]> {
  const segments: StreetSegment[] = [];

  // Check if street has house number data
  if (hasHouseNumberData(street)) {
    console.log(`Street "${street.name}" has house number data, using parity-based split`);
    segments.push(...generateSegmentsFromHouseNumbers(street, streetDbId));
  } else {
    console.log(`Street "${street.name}" has no house numbers, generating offset lines`);
    segments.push(...generateSegmentsFromOffset(street, streetDbId));
  }

  // Save segments to database
  const savedSegments: StreetSegment[] = [];

  for (const segment of segments) {
    try {
      const result = await query(
        `INSERT INTO segments_rue (street_id, zone_id, cote, geom, longueur_m)
         VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4), $5)
         RETURNING id, cote, ST_AsGeoJSON(geom)::json as geom, longueur_m`,
        [
          streetDbId,
          zoneId,
          segment.cote,
          JSON.stringify(segment.geometry),
          segment.longueurM,
        ]
      );

      savedSegments.push({
        id: result.rows[0].id,
        streetId: streetDbId,
        cote: result.rows[0].cote,
        geometry: result.rows[0].geom,
        longueurM: result.rows[0].longueur_m,
      });
    } catch (error) {
      console.error('Error saving segment:', error);
    }
  }

  return savedSegments;
}

/**
 * Generate segments based on house number parity
 */
function generateSegmentsFromHouseNumbers(
  street: OSMStreet,
  streetDbId: string
): StreetSegment[] {
  const segments: StreetSegment[] = [];
  const houseNumbers = extractHouseNumbers(street);
  const { pair, impair } = groupByParity(houseNumbers);

  // If we have both sides, create separate segments
  if (pair.length > 0) {
    const pairCoords = street.geometry.coordinates;
    const pairOffset = offsetLine(pairCoords, 3); // 3 meters to the right

    segments.push({
      streetId: streetDbId,
      cote: 'pair',
      geometry: {
        type: 'LineString',
        coordinates: pairOffset,
      },
      longueurM: calculateLineLength(pairOffset),
    });
  }

  if (impair.length > 0) {
    const impairCoords = street.geometry.coordinates;
    const impairOffset = offsetLine(impairCoords, -3); // 3 meters to the left

    segments.push({
      streetId: streetDbId,
      cote: 'impair',
      geometry: {
        type: 'LineString',
        coordinates: impairOffset,
      },
      longueurM: calculateLineLength(impairOffset),
    });
  }

  // If only one side has numbers, create a single segment
  if (pair.length === 0 && impair.length === 0) {
    segments.push({
      streetId: streetDbId,
      cote: 'both',
      geometry: street.geometry,
      longueurM: calculateLineLength(street.geometry.coordinates),
    });
  }

  return segments;
}

/**
 * Generate segments using geometric offset (when no house numbers)
 */
function generateSegmentsFromOffset(
  street: OSMStreet,
  streetDbId: string
): StreetSegment[] {
  const segments: StreetSegment[] = [];
  const coords = street.geometry.coordinates;

  // For very short streets (< 20m), create single segment
  const length = calculateLineLength(coords);
  if (length < 20) {
    segments.push({
      streetId: streetDbId,
      cote: 'both',
      geometry: street.geometry,
      longueurM: length,
    });
    return segments;
  }

  // Create offset lines using PostGIS function
  // We'll generate two offset lines: +3m (pair) and -3m (impair)

  // Pair side (right side, +3m offset)
  const pairOffset = offsetLine(coords, 3);
  segments.push({
    streetId: streetDbId,
    cote: 'pair',
    geometry: {
      type: 'LineString',
      coordinates: pairOffset,
    },
    longueurM: calculateLineLength(pairOffset),
  });

  // Impair side (left side, -3m offset)
  const impairOffset = offsetLine(coords, -3);
  segments.push({
    streetId: streetDbId,
    cote: 'impair',
    geometry: {
      type: 'LineString',
      coordinates: impairOffset,
    },
    longueurM: calculateLineLength(impairOffset),
  });

  return segments;
}

/**
 * Alternative: Use PostGIS offset function directly
 */
export async function generateSegmentsWithPostGIS(
  streetDbId: string,
  zoneId: string
): Promise<void> {
  // Generate pair segment (offset +3m)
  await query(
    `INSERT INTO segments_rue (street_id, zone_id, cote, geom, longueur_m)
     SELECT
       id,
       $1,
       'pair',
       fn_offset_line(geom, 3),
       ST_Length(fn_offset_line(geom, 3)::geography)
     FROM streets
     WHERE id = $2`,
    [zoneId, streetDbId]
  );

  // Generate impair segment (offset -3m)
  await query(
    `INSERT INTO segments_rue (street_id, zone_id, cote, geom, longueur_m)
     SELECT
       id,
       $1,
       'impair',
       fn_offset_line(geom, -3),
       ST_Length(fn_offset_line(geom, -3)::geography)
     FROM streets
     WHERE id = $2`,
    [zoneId, streetDbId]
  );
}

/**
 * Split long street into multiple segments
 */
export function splitStreetIntoChunks(
  street: OSMStreet,
  maxLengthMeters: number = 200
): OSMStreet[] {
  const coords = street.geometry.coordinates;
  const totalLength = calculateLineLength(coords);

  if (totalLength <= maxLengthMeters) {
    return [street];
  }

  const chunks: OSMStreet[] = [];
  let currentChunk: Position[] = [coords[0]];
  let currentLength = 0;

  for (let i = 1; i < coords.length; i++) {
    const segmentLength = calculateLineLength([coords[i - 1], coords[i]]);

    if (currentLength + segmentLength > maxLengthMeters && currentChunk.length > 1) {
      // Create chunk
      chunks.push({
        ...street,
        id: `${street.id}_chunk_${chunks.length}`,
        geometry: {
          type: 'LineString',
          coordinates: currentChunk,
        },
      });

      // Start new chunk
      currentChunk = [coords[i - 1]];
      currentLength = 0;
    }

    currentChunk.push(coords[i]);
    currentLength += segmentLength;
  }

  // Add last chunk
  if (currentChunk.length > 1) {
    chunks.push({
      ...street,
      id: `${street.id}_chunk_${chunks.length}`,
      geometry: {
        type: 'LineString',
        coordinates: currentChunk,
      },
    });
  }

  return chunks;
}

/**
 * Get segment midpoints for route optimization
 */
export async function getSegmentMidpoints(zoneId: string): Promise<
  Array<{
    segmentId: string;
    midpoint: Position;
    cote: string;
    longueur: number;
  }>
> {
  const result = await query(
    `SELECT
       id,
       cote,
       longueur_m,
       ST_AsGeoJSON(fn_segment_midpoint(geom))::json as midpoint
     FROM segments_rue
     WHERE zone_id = $1
     ORDER BY ordre_visite NULLS LAST, created_at`,
    [zoneId]
  );

  return result.rows.map((row) => ({
    segmentId: row.id,
    midpoint: row.midpoint.coordinates,
    cote: row.cote,
    longueur: row.longueur_m,
  }));
}

/**
 * Update segment visit order based on optimization
 */
export async function updateSegmentOrder(
  segmentIds: string[],
  order: number[]
): Promise<void> {
  // Use transaction to update all segments atomically
  try {
    await query('BEGIN');
    for (let i = 0; i < segmentIds.length; i++) {
      await query(
        `UPDATE segments_rue SET ordre_visite = $1 WHERE id = $2`,
        [order[i], segmentIds[i]]
      );
    }
    await query('COMMIT');
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

/**
 * Merge nearby segments on same street and same side
 */
export async function mergeNearbySegments(
  zoneId: string,
  thresholdMeters: number = 10
): Promise<number> {
  // Find segments that can be merged
  const result = await query(
    `WITH segment_pairs AS (
      SELECT
        s1.id as id1,
        s2.id as id2,
        s1.street_id,
        s1.cote,
        ST_Distance(s1.geom::geography, s2.geom::geography) as distance
      FROM segments_rue s1
      JOIN segments_rue s2 ON
        s1.street_id = s2.street_id
        AND s1.cote = s2.cote
        AND s1.id < s2.id
      WHERE s1.zone_id = $1
        AND ST_Distance(s1.geom::geography, s2.geom::geography) < $2
    )
    SELECT * FROM segment_pairs ORDER BY distance`,
    [zoneId, thresholdMeters]
  );

  let mergedCount = 0;

  for (const pair of result.rows) {
    try {
      // Merge the two segments by combining their geometries
      await query(
        `UPDATE segments_rue
         SET geom = ST_LineMerge(ST_Union(
           geom,
           (SELECT geom FROM segments_rue WHERE id = $1)
         ))
         WHERE id = $2`,
        [pair.id2, pair.id1]
      );

      // Delete the second segment
      await query(`DELETE FROM segments_rue WHERE id = $1`, [pair.id2]);

      mergedCount++;
    } catch (error) {
      console.error('Error merging segments:', error);
    }
  }

  return mergedCount;
}

/**
 * Calculate segment statistics for a zone
 */
export async function getSegmentStats(zoneId: string): Promise<{
  total: number;
  pair: number;
  impair: number;
  both: number;
  totalLength: number;
  averageLength: number;
  completed: number;
  inProgress: number;
}> {
  const result = await query(
    `SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN cote = 'pair' THEN 1 END) as pair,
       COUNT(CASE WHEN cote = 'impair' THEN 1 END) as impair,
       COUNT(CASE WHEN cote = 'both' THEN 1 END) as both,
       SUM(longueur_m) as total_length,
       AVG(longueur_m) as average_length,
       COUNT(CASE WHEN statut = 'fait' THEN 1 END) as completed,
       COUNT(CASE WHEN statut = 'en_cours' THEN 1 END) as in_progress
     FROM segments_rue
     WHERE zone_id = $1`,
    [zoneId]
  );

  const row = result.rows[0];

  return {
    total: parseInt(row.total),
    pair: parseInt(row.pair),
    impair: parseInt(row.impair),
    both: parseInt(row.both),
    totalLength: parseFloat(row.total_length) || 0,
    averageLength: parseFloat(row.average_length) || 0,
    completed: parseInt(row.completed),
    inProgress: parseInt(row.in_progress),
  };
}

/**
 * Get segments that need to be visited (not done yet)
 */
export async function getRemainingSegments(
  sessionId: string
): Promise<StreetSegment[]> {
  const result = await query(
    `SELECT
       s.id,
       s.street_id,
       s.cote,
       ST_AsGeoJSON(s.geom)::json as geom,
       s.longueur_m,
       s.ordre_visite,
       st.nom as street_nom
     FROM segments_rue s
     JOIN progression p ON s.id = p.segment_id
     LEFT JOIN streets st ON s.street_id = st.id
     WHERE p.session_id = $1
       AND p.fait = false
     ORDER BY s.ordre_visite NULLS LAST, s.created_at`,
    [sessionId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    streetId: row.street_id,
    cote: row.cote,
    geometry: row.geom,
    longueurM: row.longueur_m,
    ordreVisite: row.ordre_visite,
    streetNom: row.street_nom,
  }));
}

/**
 * Detect if user is on a segment based on GPS position
 */
export async function detectCurrentSegment(
  sessionId: string,
  lon: number,
  lat: number,
  thresholdMeters: number = 15
): Promise<StreetSegment | null> {
  const result = await query(
    `SELECT
       s.id,
       s.street_id,
       s.cote,
       ST_AsGeoJSON(s.geom)::json as geom,
       s.longueur_m,
       st.nom as street_nom,
       ST_Distance(s.geom::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography) as distance
     FROM segments_rue s
     JOIN progression p ON s.id = p.segment_id
     LEFT JOIN streets st ON s.street_id = st.id
     WHERE p.session_id = $1
       AND p.fait = false
       AND ST_Distance(s.geom::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography) <= $4
     ORDER BY distance ASC
     LIMIT 1`,
    [sessionId, lon, lat, thresholdMeters]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    streetId: row.street_id,
    cote: row.cote,
    geometry: row.geom,
    longueurM: row.longueur_m,
    streetNom: row.street_nom,
  };
}
