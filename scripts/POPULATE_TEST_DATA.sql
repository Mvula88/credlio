-- Populate Test Data for Credlio Platform
-- This script adds test data to help with development and testing

-- First, ensure we have some test users in auth.users (if not already present)
-- Note: In production, users are created through the signup process

-- Clear existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM public.loan_payments WHERE created_at > NOW() - INTERVAL '30 days';
-- DELETE FROM public.loan_offers WHERE created_at > NOW() - INTERVAL '30 days';
-- DELETE FROM public.loan_requests WHERE created_at > NOW() - INTERVAL '30 days';

-- Ensure countries are populated
INSERT INTO public.countries (code, name, currency_code, flag_emoji, is_active, risk_level) 
VALUES 
    ('ZA', 'South Africa', 'ZAR', '🇿🇦', true, 'low'),
    ('NG', 'Nigeria', 'NGN', '🇳🇬', true, 'medium'),
    ('KE', 'Kenya', 'KES', '🇰🇪', true, 'low'),
    ('GH', 'Ghana', 'GHS', '🇬🇭', true, 'low'),
    ('EG', 'Egypt', 'EGP', '🇪🇬', true, 'medium'),
    ('ET', 'Ethiopia', 'ETB', '🇪🇹', true, 'medium'),
    ('UG', 'Uganda', 'UGX', '🇺🇬', true, 'low'),
    ('TZ', 'Tanzania', 'TZS', '🇹🇿', true, 'low'),
    ('MA', 'Morocco', 'MAD', '🇲🇦', true, 'low'),
    ('DZ', 'Algeria', 'DZD', '🇩🇿', true, 'medium'),
    ('AO', 'Angola', 'AOA', '🇦🇴', true, 'high'),
    ('CM', 'Cameroon', 'XAF', '🇨🇲', true, 'medium'),
    ('CI', 'Ivory Coast', 'XOF', '🇨🇮', true, 'medium'),
    ('SN', 'Senegal', 'XOF', '🇸🇳', true, 'low'),
    ('ZW', 'Zimbabwe', 'ZWL', '🇿🇼', true, 'high'),
    ('ZM', 'Zambia', 'ZMW', '🇿🇲', true, 'medium')
ON CONFLICT (code) DO UPDATE
SET 
    name = EXCLUDED.name,
    currency_code = EXCLUDED.currency_code,
    flag_emoji = EXCLUDED.flag_emoji,
    is_active = EXCLUDED.is_active,
    risk_level = EXCLUDED.risk_level;

-- Ensure user roles exist
INSERT INTO public.user_roles (name, description) 
VALUES 
    ('borrower', 'Can request loans and manage repayments'),
    ('lender', 'Can offer loans and track borrowers'),
    ('admin', 'Platform administrator with full access'),
    ('country_admin', 'Administrator for specific country'),
    ('super_admin', 'Super administrator with system-wide access')
ON CONFLICT (name) DO NOTHING;

-- Create sample profiles if they don't exist
-- These will only work if you have corresponding auth users
DO $$
DECLARE
    v_country_id UUID;
    v_borrower_role_id UUID;
    v_lender_role_id UUID;
    v_admin_role_id UUID;
BEGIN
    -- Get country and role IDs
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'ZA' LIMIT 1;
    SELECT id INTO v_borrower_role_id FROM public.user_roles WHERE name = 'borrower' LIMIT 1;
    SELECT id INTO v_lender_role_id FROM public.user_roles WHERE name = 'lender' LIMIT 1;
    SELECT id INTO v_admin_role_id FROM public.user_roles WHERE name = 'admin' LIMIT 1;

    -- Insert sample profiles if they don't exist
    -- Note: These need matching auth.users entries to work properly
    
    -- Sample borrower profiles
    INSERT INTO public.profiles (
        id, 
        auth_user_id, 
        email, 
        full_name, 
        phone_number,
        country_id,
        role,
        is_verified,
        reputation_score,
        total_borrowed,
        total_repaid,
        loans_taken,
        loans_defaulted
    ) VALUES 
    (
        gen_random_uuid(),
        gen_random_uuid(), -- This should be a real auth user ID in production
        'john.borrower@example.com',
        'John Borrower',
        '+27123456789',
        v_country_id,
        'borrower',
        true,
        750,
        50000,
        45000,
        5,
        0
    ),
    (
        gen_random_uuid(),
        gen_random_uuid(),
        'jane.borrower@example.com',
        'Jane Borrower',
        '+27987654321',
        v_country_id,
        'borrower',
        true,
        650,
        30000,
        25000,
        3,
        1
    ),
    (
        gen_random_uuid(),
        gen_random_uuid(),
        'mike.borrower@example.com',
        'Mike Borrower',
        '+27555666777',
        v_country_id,
        'borrower',
        false,
        550,
        10000,
        8000,
        2,
        0
    )
    ON CONFLICT (email) DO NOTHING;

    -- Sample lender profiles
    INSERT INTO public.profiles (
        id,
        auth_user_id,
        email,
        full_name,
        phone_number,
        country_id,
        role,
        is_verified,
        total_lent,
        total_recovered,
        active_loans_count,
        borrowers_count
    ) VALUES 
    (
        gen_random_uuid(),
        gen_random_uuid(),
        'alice.lender@example.com',
        'Alice Lender',
        '+27111222333',
        v_country_id,
        'lender',
        true,
        150000,
        120000,
        5,
        12
    ),
    (
        gen_random_uuid(),
        gen_random_uuid(),
        'bob.lender@example.com',
        'Bob Lender',
        '+27444555666',
        v_country_id,
        'lender',
        true,
        250000,
        200000,
        8,
        20
    )
    ON CONFLICT (email) DO NOTHING;
END $$;

-- Create sample loan requests
INSERT INTO public.loan_requests (
    borrower_profile_id,
    amount,
    currency_code,
    purpose,
    duration_months,
    interest_rate,
    collateral_description,
    status,
    created_at,
    expires_at
)
SELECT 
    p.id,
    CASE 
        WHEN random() < 0.3 THEN 5000
        WHEN random() < 0.6 THEN 10000
        WHEN random() < 0.8 THEN 20000
        ELSE 50000
    END,
    'ZAR',
    CASE floor(random() * 5)::int
        WHEN 0 THEN 'Business expansion'
        WHEN 1 THEN 'Emergency medical expenses'
        WHEN 2 THEN 'Education fees'
        WHEN 3 THEN 'Home improvement'
        ELSE 'Working capital'
    END,
    CASE 
        WHEN random() < 0.3 THEN 3
        WHEN random() < 0.6 THEN 6
        ELSE 12
    END,
    15 + (random() * 10)::int, -- 15-25% interest rate
    CASE 
        WHEN random() < 0.5 THEN 'Vehicle - 2019 Toyota Corolla'
        WHEN random() < 0.7 THEN 'Property - Title deed available'
        ELSE NULL
    END,
    CASE 
        WHEN random() < 0.3 THEN 'active'
        WHEN random() < 0.6 THEN 'pending'
        WHEN random() < 0.8 THEN 'expired'
        ELSE 'accepted'
    END,
    NOW() - (random() * INTERVAL '30 days'),
    NOW() + (random() * INTERVAL '7 days')
FROM public.profiles p
WHERE p.role = 'borrower'
AND NOT EXISTS (
    SELECT 1 FROM public.loan_requests lr 
    WHERE lr.borrower_profile_id = p.id
)
LIMIT 10;

-- Create sample loan offers for active loan requests
INSERT INTO public.loan_offers (
    loan_request_id,
    lender_profile_id,
    offered_amount,
    interest_rate,
    duration_months,
    terms_conditions,
    status,
    created_at,
    expires_at
)
SELECT 
    lr.id,
    l.id,
    lr.amount * (0.8 + random() * 0.2), -- 80-100% of requested amount
    lr.interest_rate + (random() * 5 - 2.5), -- Vary interest rate slightly
    lr.duration_months,
    'Standard terms apply. Monthly repayment required. Late payment fee: 5% per month.',
    CASE 
        WHEN random() < 0.3 THEN 'pending'
        WHEN random() < 0.5 THEN 'accepted'
        WHEN random() < 0.7 THEN 'rejected'
        ELSE 'expired'
    END,
    lr.created_at + INTERVAL '1 day',
    lr.expires_at
FROM public.loan_requests lr
CROSS JOIN (
    SELECT id FROM public.profiles WHERE role = 'lender' LIMIT 2
) l
WHERE lr.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM public.loan_offers lo 
    WHERE lo.loan_request_id = lr.id 
    AND lo.lender_profile_id = l.id
)
LIMIT 20;

-- Create sample notifications
INSERT INTO public.notifications (
    profile_id,
    title,
    message,
    type,
    is_read,
    metadata,
    created_at
)
SELECT 
    p.id,
    CASE floor(random() * 4)::int
        WHEN 0 THEN 'New Loan Offer'
        WHEN 1 THEN 'Payment Reminder'
        WHEN 2 THEN 'Loan Request Update'
        ELSE 'System Notification'
    END,
    CASE floor(random() * 4)::int
        WHEN 0 THEN 'You have received a new loan offer'
        WHEN 1 THEN 'Your payment is due tomorrow'
        WHEN 2 THEN 'Your loan request status has been updated'
        ELSE 'Please verify your account to continue'
    END,
    CASE floor(random() * 4)::int
        WHEN 0 THEN 'loan_offer'
        WHEN 1 THEN 'payment'
        WHEN 2 THEN 'loan_request'
        ELSE 'system'
    END,
    random() < 0.3, -- 30% read
    '{}',
    NOW() - (random() * INTERVAL '7 days')
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n 
    WHERE n.profile_id = p.id
)
LIMIT 50;

-- Create sample payments for accepted loan offers
INSERT INTO public.loan_payments (
    loan_offer_id,
    borrower_profile_id,
    lender_profile_id,
    amount_due,
    amount_paid,
    currency_code,
    due_date,
    payment_date,
    payment_method,
    payment_reference,
    status
)
SELECT 
    lo.id,
    lr.borrower_profile_id,
    lo.lender_profile_id,
    lo.offered_amount / lo.duration_months, -- Monthly payment
    CASE 
        WHEN random() < 0.7 THEN lo.offered_amount / lo.duration_months
        ELSE 0
    END,
    'ZAR',
    NOW() + (generate_series * INTERVAL '1 month'),
    CASE 
        WHEN random() < 0.7 THEN NOW() + (generate_series * INTERVAL '1 month') - INTERVAL '2 days'
        ELSE NULL
    END,
    CASE floor(random() * 3)::int
        WHEN 0 THEN 'bank_transfer'
        WHEN 1 THEN 'mobile_money'
        ELSE 'cash'
    END,
    'PAY-' || substr(md5(random()::text), 1, 8),
    CASE 
        WHEN random() < 0.7 THEN 'completed'
        WHEN random() < 0.85 THEN 'pending'
        ELSE 'overdue'
    END
FROM public.loan_offers lo
JOIN public.loan_requests lr ON lo.loan_request_id = lr.id
CROSS JOIN generate_series(1, 3) -- Create 3 payments per loan
WHERE lo.status = 'accepted'
AND NOT EXISTS (
    SELECT 1 FROM public.loan_payments lp 
    WHERE lp.loan_offer_id = lo.id
)
LIMIT 30;

-- Add some borrowers to blacklist for testing
INSERT INTO public.blacklisted_borrowers (
    borrower_profile_id,
    reported_by_profile_id,
    reason,
    reason_category,
    description,
    severity_level,
    is_verified
)
SELECT 
    b.id,
    l.id,
    'Multiple payment defaults',
    'payment_default',
    'Borrower has defaulted on multiple loan payments over the past 6 months',
    CASE 
        WHEN random() < 0.3 THEN 'low'
        WHEN random() < 0.7 THEN 'medium'
        ELSE 'high'
    END,
    random() < 0.5
FROM (
    SELECT id FROM public.profiles WHERE role = 'borrower' ORDER BY random() LIMIT 2
) b
CROSS JOIN (
    SELECT id FROM public.profiles WHERE role = 'lender' LIMIT 1
) l
WHERE NOT EXISTS (
    SELECT 1 FROM public.blacklisted_borrowers bl 
    WHERE bl.borrower_profile_id = b.id
);

-- Add sample smart tags
INSERT INTO public.smart_tags (
    profile_id,
    tag_name,
    tag_value,
    tag_type,
    confidence_score,
    created_by
)
SELECT 
    p.id,
    CASE floor(random() * 4)::int
        WHEN 0 THEN 'payment_behavior'
        WHEN 1 THEN 'risk_level'
        WHEN 2 THEN 'loan_preference'
        ELSE 'verification_status'
    END,
    CASE floor(random() * 4)::int
        WHEN 0 THEN 'prompt_payer'
        WHEN 1 THEN 'low_risk'
        WHEN 2 THEN 'short_term_loans'
        ELSE 'verified'
    END,
    'system',
    70 + (random() * 30), -- 70-100% confidence
    'system'
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.smart_tags st 
    WHERE st.profile_id = p.id
)
LIMIT 20;

-- Add sample reputation badges
INSERT INTO public.reputation_badges (
    profile_id,
    badge_type,
    badge_name,
    description,
    criteria_met,
    is_active
)
SELECT 
    p.id,
    CASE floor(random() * 3)::int
        WHEN 0 THEN 'achievement'
        WHEN 1 THEN 'milestone'
        ELSE 'verification'
    END,
    CASE floor(random() * 5)::int
        WHEN 0 THEN 'Early Repayment Champion'
        WHEN 1 THEN '5 Loans Completed'
        WHEN 2 THEN 'Trusted Borrower'
        WHEN 3 THEN 'ID Verified'
        ELSE 'Active Member'
    END,
    'Earned for excellent platform participation',
    '{"loans_completed": 5, "on_time_payments": 20}',
    true
FROM public.profiles p
WHERE p.reputation_score > 600
AND NOT EXISTS (
    SELECT 1 FROM public.reputation_badges rb 
    WHERE rb.profile_id = p.id
)
LIMIT 15;

-- Create sample audit logs
INSERT INTO public.audit_logs (
    profile_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    user_agent
)
SELECT 
    p.id,
    CASE floor(random() * 5)::int
        WHEN 0 THEN 'create'
        WHEN 1 THEN 'update'
        WHEN 2 THEN 'delete'
        WHEN 3 THEN 'view'
        ELSE 'login'
    END,
    CASE floor(random() * 4)::int
        WHEN 0 THEN 'loan_request'
        WHEN 1 THEN 'loan_offer'
        WHEN 2 THEN 'payment'
        ELSE 'profile'
    END,
    gen_random_uuid()::text,
    '{"status": "pending"}',
    '{"status": "active"}',
    '192.168.1.' || floor(random() * 255)::text,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
FROM public.profiles p
CROSS JOIN generate_series(1, 3)
WHERE NOT EXISTS (
    SELECT 1 FROM public.audit_logs al 
    WHERE al.profile_id = p.id
    LIMIT 10
)
LIMIT 100;

-- Summary of test data created
DO $$
DECLARE
    v_profiles_count INT;
    v_loan_requests_count INT;
    v_loan_offers_count INT;
    v_payments_count INT;
    v_notifications_count INT;
BEGIN
    SELECT COUNT(*) INTO v_profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO v_loan_requests_count FROM public.loan_requests;
    SELECT COUNT(*) INTO v_loan_offers_count FROM public.loan_offers;
    SELECT COUNT(*) INTO v_payments_count FROM public.loan_payments;
    SELECT COUNT(*) INTO v_notifications_count FROM public.notifications;
    
    RAISE NOTICE 'Test data creation completed:';
    RAISE NOTICE '- Profiles: %', v_profiles_count;
    RAISE NOTICE '- Loan Requests: %', v_loan_requests_count;
    RAISE NOTICE '- Loan Offers: %', v_loan_offers_count;
    RAISE NOTICE '- Payments: %', v_payments_count;
    RAISE NOTICE '- Notifications: %', v_notifications_count;
END $$;

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;