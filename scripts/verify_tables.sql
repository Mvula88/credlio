-- ============================================
-- VERIFICATION QUERY - Check if tables were created
-- ============================================

-- Check all tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('loans', 'loan_repayments', 'loan_requests', 'subscription_plans', 
                           'lender_subscriptions', 'audit_logs', 'risk_alerts', 'support_tickets',
                           'notifications', 'credit_score_history', 'loan_offers')
        THEN '✅ Created'
        ELSE '⚠️ Existing'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY 
    CASE 
        WHEN table_name IN ('loans', 'subscription_plans') THEN 1
        WHEN table_name LIKE 'loan_%' THEN 2
        ELSE 3
    END,
    table_name;

-- Check subscription_plans has data
SELECT '------- SUBSCRIPTION PLANS DATA -------' as info;
SELECT * FROM subscription_plans;

-- Check profiles columns
SELECT '------- PROFILES TABLE COLUMNS -------' as info;
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('verified', 'credit_score', 'reputation_score', 'is_blacklisted',
                            'last_active_at', 'company_name', 'employment_status', 'monthly_income')
        THEN '✅ Added'
        ELSE '⚠️ Existing'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;