import { supabase } from './supabase';

/**
 * Ensures that a worker profile exists for the given user ID
 * @param userId The user ID to check
 * @returns The worker profile data
 */
export const ensureWorkerProfile = async (userId: string) => {
  try {
    // First check if the user is a worker
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, full_name')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error checking user type:', profileError);
      throw profileError;
    }
    
    // If not a worker, throw an error
    if (profileData.user_type !== 'worker') {
      throw new Error('User is not a worker');
    }
    
    // Check if worker profile exists
    const { data: workerData, error: workerError } = await supabase
      .from('worker_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    // If worker profile exists, return it
    if (!workerError && workerData) {
      return workerData;
    }
    
    // If error is not "no rows returned", throw it
    if (workerError && workerError.code !== 'PGRST116') {
      console.error('Error checking worker profile:', workerError);
      throw workerError;
    }
    
    // Create a new worker profile
    console.log('Creating worker profile for user:', userId);
    
    const { data: newWorkerData, error: createError } = await supabase
      .from('worker_profiles')
      .insert({
        id: userId,
        headline: `Professional ${profileData.full_name || 'Worker'}`,
        hourly_rate: 1000, // Default hourly rate (10.00 in cents/pence)
        years_experience: 0,
        availability: true,
        total_jobs: 0,
        avg_rating: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating worker profile:', createError);
      throw createError;
    }
    
    return newWorkerData;
  } catch (error) {
    console.error('Error ensuring worker profile:', error);
    throw error;
  }
};
