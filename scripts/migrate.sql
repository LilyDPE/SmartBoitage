-- SmartBoitage PRO - Migration Script
-- Run this to update existing database schema

-- Add any missing columns (if upgrading from older version)
DO $$
BEGIN
    -- Add tags column to streets if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'streets' AND column_name = 'tags'
    ) THEN
        ALTER TABLE streets ADD COLUMN tags JSONB;
    END IF;

    -- Add ordre_visite to segments if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'segments_rue' AND column_name = 'ordre_visite'
    ) THEN
        ALTER TABLE segments_rue ADD COLUMN ordre_visite INTEGER;
    END IF;

    -- Add route_geom to sessions if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sessions' AND column_name = 'route_geom'
    ) THEN
        ALTER TABLE sessions ADD COLUMN route_geom GEOMETRY(LineString, 4326);
    END IF;

    -- Add started_at and completed_at to progression if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'progression' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE progression ADD COLUMN started_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'progression' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE progression ADD COLUMN completed_at TIMESTAMP;
    END IF;

    RAISE NOTICE 'Schema migration completed successfully';
END $$;

-- Reindex spatial indexes for performance
REINDEX INDEX zones_geom_idx;
REINDEX INDEX streets_geom_idx;
REINDEX INDEX segments_geom_idx;

-- Update statistics
ANALYZE zones_boitage;
ANALYZE streets;
ANALYZE segments_rue;
ANALYZE sessions;
ANALYZE progression;

-- Vacuum to reclaim space
VACUUM ANALYZE;

SELECT 'Migration completed at ' || NOW() as status;
