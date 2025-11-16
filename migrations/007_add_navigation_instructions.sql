-- Migration: Add navigation instructions support
-- Add columns to store turn-by-turn navigation instructions

-- Add route_geom and route_instructions to zones table
ALTER TABLE zones
ADD COLUMN IF NOT EXISTS route_geom GEOMETRY(LineString, 4326),
ADD COLUMN IF NOT EXISTS route_instructions JSONB;

-- Add instructions column to routes_optimisees table
ALTER TABLE routes_optimisees
ADD COLUMN IF NOT EXISTS instructions JSONB;

-- Add unique constraint on zone_id for routes_optimisees
ALTER TABLE routes_optimisees
DROP CONSTRAINT IF EXISTS routes_optimisees_zone_id_key;

ALTER TABLE routes_optimisees
ADD CONSTRAINT routes_optimisees_zone_id_key UNIQUE (zone_id);

-- Add index on instructions for faster queries
CREATE INDEX IF NOT EXISTS idx_routes_optimisees_instructions ON routes_optimisees USING GIN (instructions);
CREATE INDEX IF NOT EXISTS idx_zones_route_instructions ON zones USING GIN (route_instructions);

-- Comment
COMMENT ON COLUMN zones.route_geom IS 'Optimized route geometry (LineString)';
COMMENT ON COLUMN zones.route_instructions IS 'Turn-by-turn navigation instructions from ORS';
COMMENT ON COLUMN routes_optimisees.instructions IS 'Turn-by-turn navigation instructions from ORS';
