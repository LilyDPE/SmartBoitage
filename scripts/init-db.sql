-- SmartBoitage PRO - Initial Database Setup
-- PostgreSQL + PostGIS Schema

-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    nom TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Zones de boîtage (distribution zones)
CREATE TABLE IF NOT EXISTS zones_boitage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom TEXT NOT NULL,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Streets extracted from OSM
CREATE TABLE IF NOT EXISTS streets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones_boitage(id) ON DELETE CASCADE,
    osm_id TEXT,
    nom TEXT,
    geom GEOMETRY(LineString, 4326) NOT NULL,
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Segments de rue (street segments with pair/impair sides)
CREATE TABLE IF NOT EXISTS segments_rue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    street_id UUID REFERENCES streets(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones_boitage(id) ON DELETE CASCADE,
    cote TEXT CHECK (cote IN ('pair', 'impair', 'both')),
    geom GEOMETRY(LineString, 4326) NOT NULL,
    longueur_m FLOAT,
    statut TEXT DEFAULT 'non_fait' CHECK (statut IN ('non_fait', 'en_cours', 'fait')),
    ordre_visite INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Distribution sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones_boitage(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    paused BOOLEAN DEFAULT false,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    last_position GEOMETRY(Point, 4326),
    route_geom GEOMETRY(LineString, 4326),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Progression tracking
CREATE TABLE IF NOT EXISTS progression (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES segments_rue(id) ON DELETE CASCADE,
    fait BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    timestamp TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, segment_id)
);

-- Optimized routes storage
CREATE TABLE IF NOT EXISTS routes_optimisees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID REFERENCES zones_boitage(id) ON DELETE CASCADE,
    geom GEOMETRY(LineString, 4326) NOT NULL,
    waypoints JSONB,
    distance_m FLOAT,
    duration_s FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial indexes for performance
CREATE INDEX IF NOT EXISTS zones_geom_idx ON zones_boitage USING GIST (geom);
CREATE INDEX IF NOT EXISTS streets_geom_idx ON streets USING GIST (geom);
CREATE INDEX IF NOT EXISTS segments_geom_idx ON segments_rue USING GIST (geom);
CREATE INDEX IF NOT EXISTS sessions_position_idx ON sessions USING GIST (last_position);

-- Create standard indexes
CREATE INDEX IF NOT EXISTS streets_zone_idx ON streets(zone_id);
CREATE INDEX IF NOT EXISTS segments_street_idx ON segments_rue(street_id);
CREATE INDEX IF NOT EXISTS segments_zone_idx ON segments_rue(zone_id);
CREATE INDEX IF NOT EXISTS segments_statut_idx ON segments_rue(statut);
CREATE INDEX IF NOT EXISTS progression_session_idx ON progression(session_id);
CREATE INDEX IF NOT EXISTS progression_segment_idx ON progression(segment_id);
CREATE INDEX IF NOT EXISTS sessions_zone_idx ON sessions(zone_id);

-- Function to calculate line offset (for pair/impair generation)
CREATE OR REPLACE FUNCTION fn_offset_line(
    linestring GEOMETRY,
    offset_m FLOAT
) RETURNS GEOMETRY AS $$
DECLARE
    result GEOMETRY;
BEGIN
    -- Convert to geography for accurate meter-based offset
    -- Then offset and convert back to geometry
    result := ST_OffsetCurve(linestring, offset_m);

    -- If offset failed, return original line
    IF result IS NULL THEN
        RETURN linestring;
    END IF;

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN linestring;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get segment midpoint
CREATE OR REPLACE FUNCTION fn_segment_midpoint(
    segment_geom GEOMETRY
) RETURNS GEOMETRY AS $$
BEGIN
    RETURN ST_LineInterpolatePoint(segment_geom, 0.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if point is near segment
CREATE OR REPLACE FUNCTION fn_is_near_segment(
    point_geom GEOMETRY,
    segment_geom GEOMETRY,
    threshold_m FLOAT DEFAULT 15.0
) RETURNS BOOLEAN AS $$
DECLARE
    distance FLOAT;
BEGIN
    distance := ST_Distance(
        point_geom::geography,
        segment_geom::geography
    );
    RETURN distance <= threshold_m;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get nearest segment to a point
CREATE OR REPLACE FUNCTION fn_get_nearest_segment(
    point_geom GEOMETRY,
    p_zone_id UUID,
    threshold_m FLOAT DEFAULT 15.0
) RETURNS UUID AS $$
DECLARE
    segment_id UUID;
BEGIN
    SELECT id INTO segment_id
    FROM segments_rue
    WHERE zone_id = p_zone_id
        AND ST_Distance(geom::geography, point_geom::geography) <= threshold_m
    ORDER BY ST_Distance(geom::geography, point_geom::geography) ASC
    LIMIT 1;

    RETURN segment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update segment length
CREATE OR REPLACE FUNCTION fn_update_segment_length()
RETURNS TRIGGER AS $$
BEGIN
    NEW.longueur_m := ST_Length(NEW.geom::geography);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate segment length
CREATE TRIGGER trigger_update_segment_length
    BEFORE INSERT OR UPDATE OF geom ON segments_rue
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_segment_length();

-- Function to update zone timestamp
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for zones
CREATE TRIGGER trigger_zones_updated_at
    BEFORE UPDATE ON zones_boitage
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_updated_at();

-- Trigger for sessions
CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_updated_at();

-- View for session statistics
CREATE OR REPLACE VIEW v_session_stats AS
SELECT
    s.id as session_id,
    s.zone_id,
    z.nom as zone_nom,
    s.user_id,
    s.started_at,
    s.ended_at,
    s.paused,
    COUNT(p.id) as total_segments,
    COUNT(CASE WHEN p.fait THEN 1 END) as segments_completed,
    ROUND(
        (COUNT(CASE WHEN p.fait THEN 1 END)::FLOAT / NULLIF(COUNT(p.id), 0) * 100)::NUMERIC,
        2
    ) as completion_percentage,
    SUM(seg.longueur_m) FILTER (WHERE p.fait) as distance_completed_m
FROM sessions s
LEFT JOIN zones_boitage z ON s.zone_id = z.id
LEFT JOIN progression p ON s.id = p.session_id
LEFT JOIN segments_rue seg ON p.segment_id = seg.id
GROUP BY s.id, s.zone_id, z.nom, s.user_id, s.started_at, s.ended_at, s.paused;

-- Insert default user for testing
INSERT INTO users (email, nom)
VALUES ('admin@smartboitage.fr', 'Admin SmartBoitage')
ON CONFLICT (email) DO NOTHING;

-- Grant permissions (adjust as needed)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO smartboitage_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO smartboitage_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO smartboitage_user;

COMMENT ON TABLE zones_boitage IS 'Distribution zones defined by users';
COMMENT ON TABLE streets IS 'Streets extracted from OpenStreetMap via Overpass API';
COMMENT ON TABLE segments_rue IS 'Street segments split by pair/impair sides';
COMMENT ON TABLE sessions IS 'Active or completed distribution sessions';
COMMENT ON TABLE progression IS 'Tracking which segments have been completed during a session';
COMMENT ON FUNCTION fn_offset_line IS 'Generates offset line for pair/impair side calculation';
COMMENT ON FUNCTION fn_is_near_segment IS 'Checks if a GPS point is within threshold distance of a segment';
