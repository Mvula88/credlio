-- Add Missing Constraints and Populate Test Data
-- This fixes the ON CONFLICT issue and adds test data

-- ============================================
-- STEP 1: Add unique constraints if missing
-- ============================================

-- Add unique constraint on email if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_key' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Add unique constraint on auth_user_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_auth_user_id_key' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_auth_user_id_key UNIQUE (auth_user_id);
    END IF;
END $$;

-- ============================================
-- STEP 2: Create sample profiles (without conflicts)
-- ============================================

DO $$
DECLARE
    v_country_id UUID;
    v_profile_count INT;
BEGIN
    -- Get a country ID
    SELECT id INTO v_country_id FROM public.countries WHERE code = 'ZA' LIMIT 1;
    
    -- If no country found, insert South Africa
    IF v_country_id IS NULL THEN
        INSERT INTO public.countries (code, name, currency_code)
        VALUES ('ZA', 'South Africa', 'ZAR')
        ON CONFLICT (code) DO NOTHING
        RETURNING id INTO v_country_id;
        
        -- If still null, select it
        IF v_country_id IS NULL THEN
            SELECT id INTO v_country_id FROM public.countries WHERE code = 'ZA';
        END IF;
    END IF;
    
    -- Check if we already have test profiles
    SELECT COUNT(*) INTO v_profile_count FROM public.profiles;
    
    -- Only insert test profiles if we have very few profiles
    IF v_profile_count < 5 THEN
        -- Insert sample borrower profiles (checking for existing emails first)
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'john.borrower@example.com') THEN
            INSERT INTO public.profiles (
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
            ) VALUES (
                gen_random_uuid(),
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
            );
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'jane.borrower@example.com') THEN
            INSERT INTO public.profiles (
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
            ) VALUES (
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
            );
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'mike.borrower@example.com') THEN
            INSERT INTO public.profiles (
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
            ) VALUES (
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
            );
        END IF;
        
        -- Insert sample lender profiles
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'alice.lender@example.com') THEN
            INSERT INTO public.profiles (
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
            ) VALUES (
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
            );
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'bob.lender@example.com') THEN
            INSERT INTO public.profiles (
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
            ) VALUES (
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
            );
        END IF;
        
        RAISE NOTICE 'Sample profiles created successfully';
    ELSE
        RAISE NOTICE 'Profiles already exist, skipping sample profile creation';
    END IF;
END $$;

-- ============================================
-- STEP 3: Create sample loan requests
-- ============================================

-- Only create loan requests if profiles exist and no requests exist yet
DO $$
DECLARE
    v_borrower_count INT;
    v_request_count INT;
BEGIN
    SELECT COUNT(*) INTO v_borrower_count 
    FROM public.profiles 
    WHERE role = 'borrower';
    
    SELECT COUNT(*) INTO v_request_count 
    FROM public.loan_requests;
    
    IF v_borrower_count > 0 AND v_request_count < 5 THEN
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
            COALESCE((SELECT currency_code FROM public.countries WHERE id = p.country_id), 'ZAR'),
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
            15 + (random() * 10)::int,
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
        LIMIT 5;
        
        RAISE NOTICE 'Sample loan requests created';
    END IF;
END $$;

-- ============================================
-- STEP 4: Create sample loan offers
-- ============================================

DO $$
DECLARE
    v_lender_count INT;
    v_active_requests INT;
    v_offer_count INT;
BEGIN
    SELECT COUNT(*) INTO v_lender_count 
    FROM public.profiles 
    WHERE role = 'lender';
    
    SELECT COUNT(*) INTO v_active_requests 
    FROM public.loan_requests 
    WHERE status = 'active';
    
    SELECT COUNT(*) INTO v_offer_count 
    FROM public.loan_offers;
    
    IF v_lender_count > 0 AND v_active_requests > 0 AND v_offer_count < 10 THEN
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
            lr.amount * (0.8 + random() * 0.2),
            COALESCE(lr.interest_rate, 15) + (random() * 5 - 2.5),
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
        LIMIT 10;
        
        RAISE NOTICE 'Sample loan offers created';
    END IF;
END $$;

-- ============================================
-- STEP 5: Create sample notifications
-- ============================================

DO $$
DECLARE
    v_profile_count INT;
    v_notification_count INT;
BEGIN
    SELECT COUNT(*) INTO v_profile_count FROM public.profiles;
    SELECT COUNT(*) INTO v_notification_count FROM public.notifications;
    
    IF v_profile_count > 0 AND v_notification_count < 20 THEN
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
            random() < 0.3,
            '{}',
            NOW() - (random() * INTERVAL '7 days')
        FROM public.profiles p
        LIMIT 20;
        
        RAISE NOTICE 'Sample notifications created';
    END IF;
END $$;

-- ============================================
-- STEP 6: Summary
-- ============================================

SELECT 
    'Data Population Complete!' as status,
    (SELECT COUNT(*) FROM public.profiles) as profiles_count,
    (SELECT COUNT(*) FROM public.loan_requests) as loan_requests_count,
    (SELECT COUNT(*) FROM public.loan_offers) as loan_offers_count,
    (SELECT COUNT(*) FROM public.notifications) as notifications_count;

-- Show sample data
SELECT 
    email,
    full_name,
    role,
    CASE 
        WHEN role = 'borrower' THEN 'Score: ' || COALESCE(reputation_score::text, '0')
        WHEN role = 'lender' THEN 'Lent: ' || COALESCE(total_lent::text, '0')
        ELSE 'Admin'
    END as details
FROM public.profiles
LIMIT 5;