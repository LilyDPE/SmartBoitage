-- Migration: Add route columns to zones_boitage table
-- This adds support for storing optimized routes and navigation instructions

-- Add route_geom and route_instructions to zones_boitage table
ALTER TABLE zones_boitage
ADD COLUMN IF NOT EXISTS route_geom GEOMETRY(LineString, 4326),
ADD COLUMN IF NOT EXISTS route_instructions JSONB;

-- Add index on route_instructions for faster queries
CREATE INDEX IF NOT EXISTS idx_zones_boitage_route_instructions ON zones_boitage USING GIN (route_instructions);

-- Add comments
COMMENT ON COLUMN zones_boitage.route_geom IS 'Optimized route geometry (LineString) from route planning';
COMMENT ON COLUMN zones_boitage.route_instructions IS 'Turn-by-turn navigation instructions from OpenRouteService';
