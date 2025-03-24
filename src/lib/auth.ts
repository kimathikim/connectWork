import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Check if keys are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Create a client with the service role key for admin operations
const adminSupabase = supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export const registerUser = async (
  email: string,
  password: string,
  userType: 'worker' | 'customer',
  fullName: string,
  phone?: string,
  location?: string
) => {
  try {
    // 1. Create the user in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_type: userType
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const userId = authData.user.id;

    // 2. Create profile using admin client to bypass RLS
    if (!adminSupabase) {
      throw new Error('Admin client not available - missing service role key');
    }
    
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: userId,
        user_type: userType,
        full_name: fullName,
        email: email,
        phone: phone || null,
        location: location || null,
        address: null, // Added address field with default null
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Clean up auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(userId);
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    // 3. If user is a worker, create worker profile
    if (userType === 'worker') {
      const { error: workerError } = await adminSupabase
        .from('worker_profiles')
        .insert({
          id: userId,
          headline: '',
          about: '',
          hourly_rate: 1, // Changed from 0 to 1 to satisfy the constraint
          years_experience: 0,
          availability: true,
          total_jobs: 0,
          avg_rating: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (workerError) {
        console.error("Worker profile creation error:", workerError);
        // Clean up if worker profile creation fails
        if (adminSupabase) {
          await adminSupabase.from('profiles').delete().eq('id', userId);
        } else {
          console.error("Cannot clean up profile - adminSupabase is null");
        }
        if (adminSupabase) {
          await adminSupabase.auth.admin.deleteUser(userId);
        } else {
          console.error("Cannot delete auth user - adminSupabase is null");
        }
        throw new Error(`Worker profile creation failed: ${workerError.message}`);
      }
    }

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};
