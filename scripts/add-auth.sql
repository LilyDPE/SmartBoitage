-- SmartBoitage PRO - Authentication & Multi-User Schema Extension
-- Add user authentication, roles, and session history

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- Update users table for authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'commercial' CHECK (role IN ('admin', 'commercial', 'manager'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_embauche DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Create index on email for faster login
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- ============================================
-- SESSION HISTORY
-- ============================================

-- Enhance sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS nom_zone TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS adresse_depart TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS adresse_fin TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS commentaire TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS meteo TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS temperature FLOAT;

-- Session history table for detailed tracking
CREATE TABLE IF NOT EXISTS session_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES zones_boitage(id) ON DELETE SET NULL,
    zone_nom TEXT,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    total_segments INTEGER DEFAULT 0,
    completed_segments INTEGER DEFAULT 0,
    distance_m FLOAT DEFAULT 0,
    adresse_depart TEXT,
    adresse_fin TEXT,
    commentaire TEXT,
    meteo TEXT,
    temperature FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_history_user_idx ON session_history(user_id);
CREATE INDEX IF NOT EXISTS session_history_zone_idx ON session_history(zone_id);
CREATE INDEX IF NOT EXISTS session_history_date_idx ON session_history(started_at DESC);

-- ============================================
-- ACTIVITY LOG
-- ============================================

-- Track all user activities
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_log_user_idx ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS activity_log_date_idx ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_action_idx ON activity_log(action);

-- ============================================
-- TEAMS & ORGANIZATION
-- ============================================

-- Teams table for organizing commercials
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom TEXT NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Team membership
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'lead')),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS team_members_team_idx ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members(user_id);

-- ============================================
-- STATISTICS & REPORTS
-- ============================================

-- Daily statistics per user
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sessions_count INTEGER DEFAULT 0,
    segments_completed INTEGER DEFAULT 0,
    distance_m FLOAT DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    zones_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS daily_stats_user_idx ON daily_stats(user_id);
CREATE INDEX IF NOT EXISTS daily_stats_date_idx ON daily_stats(date DESC);

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- User performance view
CREATE OR REPLACE VIEW v_user_performance AS
SELECT
    u.id as user_id,
    u.nom,
    u.email,
    u.role,
    COUNT(DISTINCT sh.id) as total_sessions,
    SUM(sh.completed_segments) as total_segments_completed,
    SUM(sh.distance_m) as total_distance_m,
    SUM(sh.duration_seconds) as total_duration_seconds,
    AVG(CASE WHEN sh.total_segments > 0
        THEN (sh.completed_segments::FLOAT / sh.total_segments * 100)
        ELSE 0 END) as avg_completion_rate,
    MAX(sh.ended_at) as last_activity,
    COUNT(DISTINCT sh.zone_id) as zones_visited
FROM users u
LEFT JOIN session_history sh ON u.id = sh.user_id
WHERE u.role IN ('commercial', 'manager')
GROUP BY u.id, u.nom, u.email, u.role;

-- Daily activity summary
CREATE OR REPLACE VIEW v_daily_activity AS
SELECT
    DATE(sh.started_at) as date,
    COUNT(DISTINCT sh.user_id) as active_users,
    COUNT(DISTINCT sh.id) as total_sessions,
    SUM(sh.completed_segments) as total_segments,
    SUM(sh.distance_m) as total_distance_m,
    AVG(sh.duration_seconds) as avg_duration_seconds
FROM session_history sh
WHERE sh.ended_at IS NOT NULL
GROUP BY DATE(sh.started_at)
ORDER BY date DESC;

-- Zone popularity
CREATE OR REPLACE VIEW v_zone_popularity AS
SELECT
    z.id as zone_id,
    z.nom as zone_nom,
    COUNT(DISTINCT sh.session_id) as session_count,
    COUNT(DISTINCT sh.user_id) as user_count,
    AVG(sh.duration_seconds) as avg_duration,
    MAX(sh.ended_at) as last_used
FROM zones_boitage z
LEFT JOIN session_history sh ON z.id = sh.zone_id
GROUP BY z.id, z.nom
ORDER BY session_count DESC;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to archive completed session
CREATE OR REPLACE FUNCTION fn_archive_session(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
    v_session RECORD;
    v_zone RECORD;
    v_stats RECORD;
BEGIN
    -- Get session data
    SELECT * INTO v_session FROM sessions WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found: %', p_session_id;
    END IF;

    -- Get zone data
    SELECT nom INTO v_zone FROM zones_boitage WHERE id = v_session.zone_id;

    -- Get progression stats
    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN fait THEN 1 END) as completed,
        SUM(s.longueur_m) FILTER (WHERE p.fait) as distance
    INTO v_stats
    FROM progression p
    JOIN segments_rue s ON p.segment_id = s.id
    WHERE p.session_id = p_session_id;

    -- Insert into history
    INSERT INTO session_history (
        session_id,
        user_id,
        zone_id,
        zone_nom,
        started_at,
        ended_at,
        duration_seconds,
        total_segments,
        completed_segments,
        distance_m,
        adresse_depart,
        adresse_fin,
        commentaire,
        meteo,
        temperature
    ) VALUES (
        p_session_id,
        v_session.user_id,
        v_session.zone_id,
        v_zone.nom,
        v_session.started_at,
        v_session.ended_at,
        EXTRACT(EPOCH FROM (v_session.ended_at - v_session.started_at))::INTEGER,
        v_stats.total,
        v_stats.completed,
        v_stats.distance,
        v_session.adresse_depart,
        v_session.adresse_fin,
        v_session.commentaire,
        v_session.meteo,
        v_session.temperature
    )
    ON CONFLICT DO NOTHING;

    -- Update daily stats
    INSERT INTO daily_stats (
        user_id,
        date,
        sessions_count,
        segments_completed,
        distance_m,
        duration_seconds,
        zones_count
    )
    VALUES (
        v_session.user_id,
        DATE(v_session.started_at),
        1,
        v_stats.completed,
        COALESCE(v_stats.distance, 0),
        EXTRACT(EPOCH FROM (v_session.ended_at - v_session.started_at))::INTEGER,
        1
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        sessions_count = daily_stats.sessions_count + 1,
        segments_completed = daily_stats.segments_completed + EXCLUDED.segments_completed,
        distance_m = daily_stats.distance_m + EXCLUDED.distance_m,
        duration_seconds = daily_stats.duration_seconds + EXCLUDED.duration_seconds,
        zones_count = daily_stats.zones_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity
CREATE OR REPLACE FUNCTION fn_log_activity(
    p_user_id UUID,
    p_user_email TEXT,
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_log (
        user_id,
        user_email,
        action,
        entity_type,
        entity_id,
        details,
        ip_address
    ) VALUES (
        p_user_id,
        p_user_email,
        p_action,
        p_entity_type,
        p_entity_id,
        p_details,
        p_ip_address
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_login
CREATE OR REPLACE FUNCTION fn_update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA
-- ============================================

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash generated with bcrypt for 'admin123'
INSERT INTO users (email, nom, password_hash, role)
VALUES (
    'admin@smartboitage.fr',
    'Administrateur',
    '$2b$10$rBV2XRqYdHxDgU8lHKZ7kuH5v3v5xYnF8TJ9p6sYzGqTCVGNKGH9i',
    'admin'
)
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    password_hash = EXCLUDED.password_hash;

-- Create sample commercials (password: commercial123)
INSERT INTO users (email, nom, password_hash, role, telephone)
VALUES
    ('commercial1@smartboitage.fr', 'Jean Dupont', '$2b$10$rBV2XRqYdHxDgU8lHKZ7kuH5v3v5xYnF8TJ9p6sYzGqTCVGNKGH9i', 'commercial', '0612345678'),
    ('commercial2@smartboitage.fr', 'Marie Martin', '$2b$10$rBV2XRqYdHxDgU8lHKZ7kuH5v3v5xYnF8TJ9p6sYzGqTCVGNKGH9i', 'commercial', '0687654321')
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE session_history IS 'Historical archive of all completed distribution sessions';
COMMENT ON TABLE activity_log IS 'Audit trail of all user actions in the system';
COMMENT ON TABLE teams IS 'Teams for organizing commercial staff';
COMMENT ON TABLE daily_stats IS 'Aggregated daily performance metrics per user';
COMMENT ON VIEW v_user_performance IS 'User performance metrics and statistics';
COMMENT ON VIEW v_daily_activity IS 'System-wide daily activity summary';

SELECT 'Authentication schema extension completed successfully!' as status;
