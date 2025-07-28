-- Enable Row Level Security on all tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklisted_borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lender_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrower_smart_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- Create helper functions in the 'public' schema

-- Create a function to get the current user's profile ID
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID AS $$
SELECT id FROM public.profiles
WHERE auth_user_id = auth.uid()
LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER;
COMMENT ON FUNCTION public.get_current_profile_id() IS 'Returns the profile_id of the currently authenticated user.';


-- Create a function to check if the current user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(p_role_name TEXT)
RETURNS BOOLEAN AS $$
SELECT EXISTS (
  SELECT 1 FROM public.user_profile_roles upr
  JOIN public.user_roles ur ON upr.role_id = ur.id
  WHERE upr.profile_id = public.get_current_profile_id()
  AND ur.role_name = p_role_name
);
$$ LANGUAGE SQL SECURITY DEFINER;
COMMENT ON FUNCTION public.user_has_role(TEXT) IS 'Checks if the current user has a specific role.';


-- Create a function to get the current user's country ID
CREATE OR REPLACE FUNCTION public.get_current_user_country_id()
RETURNS UUID AS $$
SELECT country_id FROM public.profiles
WHERE id = public.get_current_profile_id()
LIMIT 1
$$ LANGUAGE SQL SECURITY DEFINER;
COMMENT ON FUNCTION public.get_current_user_country_id() IS 'Returns the country_id of the currently authenticated user.';


-- Create a function to check if the current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
SELECT public.user_has_role('super_admin');
$$ LANGUAGE SQL SECURITY DEFINER;
COMMENT ON FUNCTION public.is_super_admin() IS 'Checks if the current user is a super admin.';


-- Create a function to check if the current user is a country admin
CREATE OR REPLACE FUNCTION public.is_country_admin()
RETURNS BOOLEAN AS $$
SELECT public.user_has_role('country_admin');
$$ LANGUAGE SQL SECURITY DEFINER;
COMMENT ON FUNCTION public.is_country_admin() IS 'Checks if the current user is a country admin.';
