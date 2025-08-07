const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);

async function testConnection() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (...args) => {
          console.log('Fetching:', args[0]);
          return fetch(...args);
        }
      }
    });

    // Simple test - try to get auth session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
    } else {
      console.log('Connection successful!');
      console.log('Session data:', data);
    }

    // Test database connection
    const { data: countries, error: dbError } = await supabase
      .from('countries')
      .select('*')
      .limit(1);

    if (dbError) {
      console.error('Database error:', dbError);
    } else {
      console.log('Database connection successful!');
      console.log('Sample data:', countries);
    }

  } catch (error) {
    console.error('Connection failed:', error);
    console.error('Error details:', {
      message: error.message,
      cause: error.cause,
      stack: error.stack
    });
  }
}

testConnection();