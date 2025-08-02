-- =====================================================
-- Add All 16 African Countries
-- Run this if you already have the database set up
-- =====================================================

-- Insert all countries (will skip existing ones due to ON CONFLICT)
INSERT INTO countries (name, code, currency_code) VALUES
('Nigeria', 'NG', 'NGN'),
('Kenya', 'KE', 'KES'),
('Uganda', 'UG', 'UGX'),
('South Africa', 'ZA', 'ZAR'),
('Ghana', 'GH', 'GHS'),
('Tanzania', 'TZ', 'TZS'),
('Rwanda', 'RW', 'RWF'),
('Zambia', 'ZM', 'ZMW'),
('Namibia', 'NA', 'NAD'),
('Botswana', 'BW', 'BWP'),
('Malawi', 'MW', 'MWK'),
('Senegal', 'SN', 'XOF'),
('Ethiopia', 'ET', 'ETB'),
('Cameroon', 'CM', 'XAF'),
('Sierra Leone', 'SL', 'SLL'),
('Zimbabwe', 'ZW', 'ZWL')
ON CONFLICT (code) DO NOTHING;

-- Verify all countries were added
SELECT * FROM countries ORDER BY name;

