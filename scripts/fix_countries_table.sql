-- Drop and recreate countries table with correct structure
DROP TABLE IF EXISTS countries CASCADE;

CREATE TABLE countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(3) NOT NULL UNIQUE,
  currency_code VARCHAR(3) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL,
  flag_emoji VARCHAR(10) NOT NULL,
  basic_price DECIMAL(10,2) NOT NULL,
  premium_price DECIMAL(10,2) NOT NULL,
  has_special_payment_logic BOOLEAN DEFAULT false,
  special_payment_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert your 7 target countries with pricing
INSERT INTO countries (name, code, currency_code, currency_symbol, flag_emoji, basic_price, premium_price, has_special_payment_logic, special_payment_message) VALUES
('Namibia', 'NAM', 'NAD', 'N$', '🇳🇦', 180.00, 250.00, true, 'Namibian lenders can also subscribe via eWallet or bank transfer. Contact +264 81 440 1522 for manual activation.'),
('Nigeria', 'NGA', 'NGN', '₦', '🇳🇬', 75000.00, 105000.00, false, null),
('Kenya', 'KEN', 'KES', 'KSh', '🇰🇪', 2500.00, 3500.00, false, null),
('Ghana', 'GHA', 'GHS', '₵', '🇬🇭', 150.00, 210.00, false, null),
('Tanzania', 'TZA', 'TZS', 'TSh', '🇹🇿', 45000.00, 63000.00, false, null),
('Uganda', 'UGA', 'UGX', 'USh', '🇺🇬', 750000.00, 1050000.00, false, null),
('South Africa', 'ZAF', 'ZAR', 'R', '🇿🇦', 350.00, 490.00, false, null);

-- Enable RLS
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Anyone can view countries (for signup/selection)
CREATE POLICY "Anyone can view countries" ON countries
  FOR SELECT USING (true);
