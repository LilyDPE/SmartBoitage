// Database connection pool for PostgreSQL + PostGIS
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Query helper with automatic connection management
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get a client from the pool for transactions
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

// Transaction helper
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Database helper functions for common GIS operations
export const db = {
  // Create a new zone
  async createZone(nom: string, geom: any, userId?: string) {
    const result = await query(
      `INSERT INTO zones_boitage (nom, geom, user_id)
       VALUES ($1, ST_GeomFromGeoJSON($2), $3)
       RETURNING id, nom, ST_AsGeoJSON(geom)::json as geom, created_at`,
      [nom, JSON.stringify(geom), userId || null]
    );
    return result.rows[0];
  },

  // Get zone by ID
  async getZone(zoneId: string) {
    const result = await query(
      `SELECT id, nom, ST_AsGeoJSON(geom)::json as geom,
              ST_AsGeoJSON(route_geom)::json as route_geom,
              route_instructions,
              created_at, updated_at
       FROM zones_boitage
       WHERE id = $1`,
      [zoneId]
    );
    return result.rows[0];
  },

  // Get all zones
  async getAllZones(userId?: string) {
    const sql = userId
      ? `SELECT id, nom, ST_AsGeoJSON(geom)::json as geom, created_at
         FROM zones_boitage
         WHERE user_id = $1
         ORDER BY created_at DESC`
      : `SELECT id, nom, ST_AsGeoJSON(geom)::json as geom, created_at
         FROM zones_boitage
         ORDER BY created_at DESC`;

    const result = await query(sql, userId ? [userId] : []);
    return result.rows;
  },

  // Insert street from OSM
  async insertStreet(zoneId: string, osmId: string, nom: string, geom: any, tags?: any) {
    const result = await query(
      `INSERT INTO streets (zone_id, osm_id, nom, geom, tags)
       VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4), $5)
       RETURNING id, osm_id, nom, ST_AsGeoJSON(geom)::json as geom`,
      [zoneId, osmId, nom, JSON.stringify(geom), tags ? JSON.stringify(tags) : null]
    );
    return result.rows[0];
  },

  // Get streets for a zone
  async getStreets(zoneId: string) {
    const result = await query(
      `SELECT id, osm_id, nom, ST_AsGeoJSON(geom)::json as geom, tags
       FROM streets
       WHERE zone_id = $1`,
      [zoneId]
    );
    return result.rows;
  },

  // Insert segment
  async insertSegment(streetId: string, zoneId: string, cote: string, geom: any, ordreVisite?: number) {
    const result = await query(
      `INSERT INTO segments_rue (street_id, zone_id, cote, geom, ordre_visite)
       VALUES ($1, $2, $3, ST_GeomFromGeoJSON($4), $5)
       RETURNING id, cote, ST_AsGeoJSON(geom)::json as geom, longueur_m, statut, ordre_visite`,
      [streetId, zoneId, cote, JSON.stringify(geom), ordreVisite || null]
    );
    return result.rows[0];
  },

  // Get segments for a zone
  async getSegments(zoneId: string) {
    const result = await query(
      `SELECT
         s.id,
         s.street_id,
         s.cote,
         ST_AsGeoJSON(s.geom)::json as geom,
         s.longueur_m,
         s.statut,
         s.ordre_visite,
         st.nom as street_nom
       FROM segments_rue s
       LEFT JOIN streets st ON s.street_id = st.id
       WHERE s.zone_id = $1
       ORDER BY s.ordre_visite NULLS LAST, s.created_at`,
      [zoneId]
    );
    return result.rows;
  },

  // Update segment order
  async updateSegmentOrder(segmentId: string, ordre: number) {
    await query(
      `UPDATE segments_rue SET ordre_visite = $1 WHERE id = $2`,
      [ordre, segmentId]
    );
  },

  // Update segment status
  async updateSegmentStatus(segmentId: string, statut: string) {
    const result = await query(
      `UPDATE segments_rue
       SET statut = $1
       WHERE id = $2
       RETURNING id, statut`,
      [statut, segmentId]
    );
    return result.rows[0];
  },

  // Create session
  async createSession(zoneId: string, userId?: string, routeGeom?: any) {
    const result = await query(
      `INSERT INTO sessions (zone_id, user_id, route_geom)
       VALUES ($1, $2, ${routeGeom ? 'ST_GeomFromGeoJSON($3)' : 'NULL'})
       RETURNING id, zone_id, started_at, paused`,
      routeGeom ? [zoneId, userId || null, JSON.stringify(routeGeom)] : [zoneId, userId || null]
    );

    // Initialize progression for all segments in the zone
    await query(
      `INSERT INTO progression (session_id, segment_id, fait)
       SELECT $1, id, false
       FROM segments_rue
       WHERE zone_id = $2`,
      [result.rows[0].id, zoneId]
    );

    return result.rows[0];
  },

  // Get session
  async getSession(sessionId: string) {
    const result = await query(
      `SELECT
         id,
         zone_id,
         user_id,
         paused,
         started_at,
         ended_at,
         ST_AsGeoJSON(last_position)::json as last_position,
         ST_AsGeoJSON(route_geom)::json as route_geom,
         updated_at
       FROM sessions
       WHERE id = $1`,
      [sessionId]
    );
    return result.rows[0];
  },

  // Update session position
  async updateSessionPosition(sessionId: string, lon: number, lat: number) {
    await query(
      `UPDATE sessions
       SET last_position = ST_SetSRID(ST_Point($2, $3), 4326),
           updated_at = NOW()
       WHERE id = $1`,
      [sessionId, lon, lat]
    );
  },

  // Pause session
  async pauseSession(sessionId: string) {
    await query(
      `UPDATE sessions SET paused = true, updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );
  },

  // Resume session
  async resumeSession(sessionId: string) {
    await query(
      `UPDATE sessions SET paused = false, updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );
  },

  // End session
  async endSession(sessionId: string) {
    await query(
      `UPDATE sessions SET ended_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );
  },

  // Get progression for session
  async getProgression(sessionId: string) {
    const result = await query(
      `SELECT
         p.id,
         p.segment_id,
         p.fait,
         p.started_at,
         p.completed_at,
         s.cote,
         ST_AsGeoJSON(s.geom)::json as geom,
         s.longueur_m,
         s.ordre_visite,
         st.nom as street_nom
       FROM progression p
       JOIN segments_rue s ON p.segment_id = s.id
       LEFT JOIN streets st ON s.street_id = st.id
       WHERE p.session_id = $1
       ORDER BY s.ordre_visite NULLS LAST, s.created_at`,
      [sessionId]
    );
    return result.rows;
  },

  // Mark segment as completed in session
  async completeSegment(sessionId: string, segmentId: string) {
    const result = await query(
      `UPDATE progression
       SET fait = true,
           completed_at = NOW(),
           started_at = COALESCE(started_at, NOW())
       WHERE session_id = $1 AND segment_id = $2
       RETURNING id, fait, completed_at`,
      [sessionId, segmentId]
    );

    // Also update segment status
    await query(
      `UPDATE segments_rue SET statut = 'fait' WHERE id = $1`,
      [segmentId]
    );

    return result.rows[0];
  },

  // Start segment (mark as in progress)
  async startSegment(sessionId: string, segmentId: string) {
    await query(
      `UPDATE progression
       SET started_at = COALESCE(started_at, NOW())
       WHERE session_id = $1 AND segment_id = $2`,
      [sessionId, segmentId]
    );

    await query(
      `UPDATE segments_rue SET statut = 'en_cours' WHERE id = $1`,
      [segmentId]
    );
  },

  // Find nearest segment to GPS position
  async findNearestSegment(zoneId: string, lon: number, lat: number, thresholdM: number = 15) {
    const result = await query(
      `SELECT
         s.id,
         s.cote,
         ST_AsGeoJSON(s.geom)::json as geom,
         ST_Distance(s.geom::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography) as distance_m
       FROM segments_rue s
       WHERE s.zone_id = $1
         AND ST_Distance(s.geom::geography, ST_SetSRID(ST_Point($2, $3), 4326)::geography) <= $4
       ORDER BY distance_m ASC
       LIMIT 1`,
      [zoneId, lon, lat, thresholdM]
    );
    return result.rows[0];
  },

  // Save optimized route
  async saveRoute(zoneId: string, geom: any, waypoints: any[], distanceM: number, durationS: number, instructions?: any[]) {
    // Try to update zone with route info and instructions
    await query(
      `UPDATE zones
       SET route_geom = ST_GeomFromGeoJSON($1),
           route_instructions = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(geom), instructions ? JSON.stringify(instructions) : null, zoneId]
    );

    // Also save in routes_optimisees table for history
    const result = await query(
      `INSERT INTO routes_optimisees (zone_id, geom, waypoints, distance_m, duration_s, instructions)
       VALUES ($1, ST_GeomFromGeoJSON($2), $3, $4, $5, $6)
       ON CONFLICT (zone_id) DO UPDATE SET
         geom = EXCLUDED.geom,
         waypoints = EXCLUDED.waypoints,
         distance_m = EXCLUDED.distance_m,
         duration_s = EXCLUDED.duration_s,
         instructions = EXCLUDED.instructions,
         created_at = NOW()
       RETURNING id, distance_m, duration_s, created_at`,
      [zoneId, JSON.stringify(geom), JSON.stringify(waypoints), distanceM, durationS, instructions ? JSON.stringify(instructions) : null]
    );
    return result.rows[0];
  },

  // Get session statistics
  async getSessionStats(sessionId: string) {
    const result = await query(
      `SELECT * FROM v_session_stats WHERE session_id = $1`,
      [sessionId]
    );
    return result.rows[0];
  },

  // Delete zone and all related data (cascade)
  async deleteZone(zoneId: string) {
    await query(`DELETE FROM zones_boitage WHERE id = $1`, [zoneId]);
  },
};

export default pool;
