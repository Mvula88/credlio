-- Create exec_sql function for dynamic SQL execution
-- This function allows executing SQL statements dynamically
-- Required for the setup-country-database.ts script

CREATE OR REPLACE FUNCTION exec_sql(sql text) 
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the service role
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- Add a comment to document the function
COMMENT ON FUNCTION exec_sql(text) IS 'Executes dynamic SQL statements. Used for database setup scripts.';