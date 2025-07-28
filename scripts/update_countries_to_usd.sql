-- Update all countries to use USD pricing
UPDATE countries SET 
  currency_code = 'USD',
  currency_symbol = '$',
  basic_price = 12.00,
  premium_price = 17.00
WHERE code IN ('NAM', 'NGA', 'KEN', 'GHA', 'TZA', 'UGA', 'ZAF');

-- Keep Namibian special payment logic
UPDATE countries SET 
  special_payment_message = 'Namibian lenders can also subscribe via eWallet or bank transfer. Contact +264 81 440 1522 for manual activation.'
WHERE code = 'NAM';
