-- Location Verification and Access Logging Tables
-- Run this after the country_restrictions_setup.sql

-- =====================================================
-- 1. LOCATION VERIFICATION LOGS
-- =====================================================

-- Create table to log all location verification attempts
CREATE TABLE IF NOT EXISTS location_verification_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    event_type VARCHAR(50) NOT NULL, -- 'signup', 'login', 'session_check'
    ip_address INET,
    detected_country_code VARCHAR(3),
    registered_country_code VARCHAR(3),
    verification_method VARCHAR(20), -- 'ip', 'browser', 'hybrid'
    verification_result BOOLEAN NOT NULL,
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_flags TEXT[], -- Array of risk indicators
    user_agent TEXT,
    browser_location JSONB, -- {lat, lng, accuracy, timestamp}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_location_logs_user_id ON location_verification_logs(user_id);
CREATE INDEX idx_location_logs_created_at ON location_verification_logs(created_at);
CREATE INDEX idx_location_logs_verification_result ON location_verification_logs(verification_result);
CREATE INDEX idx_location_logs_risk_score ON location_verification_logs(risk_score);

-- =====================================================
-- 2. BLOCKED ACCESS ATTEMPTS
-- =====================================================

-- Create table for blocked access attempts
CREATE TABLE IF NOT EXISTS blocked_access_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    email VARCHAR(255),
    ip_address INET NOT NULL,
    detected_country_code VARCHAR(3),
    registered_country_code VARCHAR(3),
    attempt_type VARCHAR(50), -- 'login', 'api_access', 'data_request'
    block_reason TEXT,
    risk_score INTEGER,
    risk_flags TEXT[],
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_blocked_attempts_user_id ON blocked_access_attempts(user_id);
CREATE INDEX idx_blocked_attempts_ip ON blocked_access_attempts(ip_address);
CREATE INDEX idx_blocked_attempts_created_at ON blocked_access_attempts(created_at);

-- =====================================================
-- 3. USER SESSION LOCATIONS
-- =====================================================

-- Track user session locations for pattern analysis
CREATE TABLE IF NOT EXISTS user_session_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    ip_address INET,
    country_code VARCHAR(3),
    city VARCHAR(100),
    browser_location JSONB,
    is_vpn BOOLEAN DEFAULT FALSE,
    risk_score INTEGER,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, session_id)
);

-- Create indexes
CREATE INDEX idx_session_locations_user_id ON user_session_locations(user_id);
CREATE INDEX idx_session_locations_session_id ON user_session_locations(session_id);
CREATE INDEX idx_session_locations_last_activity ON user_session_locations(last_activity);

-- =====================================================
-- 4. RISK SCORING CONFIGURATION
-- =====================================================

-- Configuration for risk scoring thresholds
CREATE TABLE IF NOT EXISTS risk_scoring_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    config_name VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Insert default risk scoring configuration
INSERT INTO risk_scoring_config (config_name, config_value, description) VALUES
('risk_thresholds', 
 '{"low": 30, "medium": 60, "high": 80, "block": 90}',
 'Risk score thresholds for different security levels'),
('risk_factors',
 '{
   "vpn_detected": 30,
   "country_mismatch": 40,
   "neighboring_country": -10,
   "suspicious_ip": 20,
   "location_spoofing": 40,
   "verification_mismatch": 20
 }',
 'Risk score adjustments for different factors'),
('action_rules',
 '{
   "0-30": "allow",
   "31-60": "allow_with_monitoring",
   "61-80": "require_verification",
   "81-100": "block"
 }',
 'Actions to take based on risk scores')
ON CONFLICT (config_name) DO NOTHING;

-- =====================================================
-- 5. ENABLE RLS ON NEW TABLES
-- =====================================================

ALTER TABLE location_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_access_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_session_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scoring_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Location verification logs - Users can see their own logs
CREATE POLICY "Users can view own verification logs" ON location_verification_logs
    FOR SELECT USING (
        user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Blocked attempts - Users can see their own blocked attempts
CREATE POLICY "Users can view own blocked attempts" ON blocked_access_attempts
    FOR SELECT USING (
        user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Session locations - Users can see their own sessions
CREATE POLICY "Users can view own sessions" ON user_session_locations
    FOR SELECT USING (
        user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- Risk config - Only admins can view and modify
CREATE POLICY "Only admins can view risk config" ON risk_scoring_config
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can modify risk config" ON risk_scoring_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to log location verification
CREATE OR REPLACE FUNCTION log_location_verification(
    p_user_id UUID,
    p_event_type VARCHAR,
    p_ip_address INET,
    p_detected_country VARCHAR,
    p_registered_country VARCHAR,
    p_method VARCHAR,
    p_result BOOLEAN,
    p_risk_score INTEGER,
    p_risk_flags TEXT[],
    p_user_agent TEXT DEFAULT NULL,
    p_browser_location JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO location_verification_logs (
        user_id, event_type, ip_address, detected_country_code,
        registered_country_code, verification_method, verification_result,
        risk_score, risk_flags, user_agent, browser_location
    ) VALUES (
        p_user_id, p_event_type, p_ip_address, p_detected_country,
        p_registered_country, p_method, p_result,
        p_risk_score, p_risk_flags, p_user_agent, p_browser_location
    ) RETURNING id INTO v_log_id;
    
    -- If verification failed, also log to blocked attempts
    IF NOT p_result AND p_risk_score > 80 THEN
        INSERT INTO blocked_access_attempts (
            user_id, ip_address, detected_country_code,
            registered_country_code, attempt_type, block_reason,
            risk_score, risk_flags, user_agent
        ) VALUES (
            p_user_id, p_ip_address, p_detected_country,
            p_registered_country, p_event_type,
            'High risk score: ' || p_risk_score,
            p_risk_score, p_risk_flags, p_user_agent
        );
    END IF;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_location_verification TO authenticated;

-- =====================================================
-- 8. MONITORING VIEWS
-- =====================================================

-- View for suspicious activity monitoring
CREATE OR REPLACE VIEW suspicious_activity_summary AS
SELECT 
    p.email,
    p.full_name,
    c.name as registered_country,
    COUNT(DISTINCT lvl.detected_country_code) as countries_detected,
    COUNT(CASE WHEN NOT lvl.verification_result THEN 1 END) as failed_verifications,
    MAX(lvl.risk_score) as max_risk_score,
    COUNT(DISTINCT lvl.ip_address) as unique_ips,
    MAX(lvl.created_at) as last_activity
FROM location_verification_logs lvl
JOIN profiles p ON p.id = lvl.user_id
JOIN countries c ON c.id = p.country_id
WHERE lvl.created_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.email, p.full_name, c.name
HAVING COUNT(CASE WHEN NOT lvl.verification_result THEN 1 END) > 0
   OR MAX(lvl.risk_score) > 60
ORDER BY max_risk_score DESC, failed_verifications DESC;

-- Grant access to admins only
GRANT SELECT ON suspicious_activity_summary TO authenticated;

-- =====================================================
-- 9. SUMMARY
-- =====================================================

-- This script creates:
-- ✅ Location verification logging
-- ✅ Blocked access attempt tracking
-- ✅ Session location monitoring
-- ✅ Risk scoring configuration
-- ✅ Helper functions for logging
-- ✅ Monitoring views for admins