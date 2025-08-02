-- Test Country-Based Data Isolation
-- Run these queries as different users to verify isolation works

-- =====================================================
-- 1. CHECK YOUR CURRENT USER AND COUNTRY
-- =====================================================
SELECT 
    p.email,
    p.full_name,
    p.role,
    c.name as country,
    c.code as country_code
FROM profiles p
JOIN countries c ON c.id = p.country_id
WHERE p.auth_user_id = auth.uid();

-- =====================================================

JOIN countries c ON c.id = p.country_id
LIMIT 10;

-- =====================================================
-- 3. TEST LOAN REQUESTS - Should only see from your country
-- =====================================================
SELECT 
    lr.id,
    lr.amount,
    p.full_name as borrower_name,
    c.name as borrower_country
FROM loan_requests lr
JOIN profiles p ON p.id = lr.borrower_id
JOIN countries c ON c.id = p.country_id
LIMIT 10;

-- =====================================================
-- 4. TEST BLACKLIST - Should only see from your country
-- =====================================================
SELECT 
    b.id,
    borrower.full_name as borrower_name,
    borrower_country.name as borrower_country,
    lender.full_name as blacklisted_by,
    b.reason
FROM blacklist b
JOIN profiles borrower ON borrower.id = b.borrower_id
JOIN profiles lender ON lender.id = b.lender_id
JOIN countries borrower_country ON borrower_country.id = borrower.country_id
LIMIT 10;

-- =====================================================
-- 5. VERIFY CROSS-COUNTRY ACCESS IS BLOCKED
-- =====================================================
-- This query shows what countries exist in the system
SELECT 
    c.name,
    c.code,
    COUNT(p.id) as total_users,
    COUNT(CASE WHEN p.role = 'borrower' THEN 1 END) as borrowers,
    COUNT(CASE WHEN p.role = 'lender' THEN 1 END) as lenders
FROM countries c
LEFT JOIN profiles p ON p.country_id = c.id
GROUP BY c.id, c.name, c.code
ORDER BY total_users DESC;

-- =====================================================
-- 6. TEST SUMMARY
-- =====================================================
-- If isolation is working correctly:
-- ✅ Lenders see only borrowers from their own country
-- ✅ Loan requests are filtered by country
-- ✅ Blacklist entries are country-specific
-- ✅ No data leakage across countries

-- If you see data from multiple countries as a lender, 
-- there's an issue with the policies.