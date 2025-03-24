import { supabase } from './supabase';
import { NavigateFunction } from 'react-router-dom';

// Centralized auth check function
export const checkUserAuth = async (
  navigate: NavigateFunction,
  requiredUserType?: 'worker' | 'customer',
  redirectPath?: string
) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: redirectPath || window.location.pathname } });
      return { authenticated: false };
    }
    
    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();
      
    if (profileError) throw profileError;
    
    // If specific user type required, check and redirect if needed
    if (requiredUserType && profileData.user_type !== requiredUserType) {
      // Redirect to appropriate dashboard
      const redirectTo = profileData.user_type === 'worker' 
        ? '/worker/dashboard' 
        : '/dashboard';
        
      navigate(redirectTo);
      return { 
        authenticated: true, 
        user, 
        userType: profileData.user_type,
        authorized: false 
      };
    }
    
    // User is authenticated and authorized
    return { 
      authenticated: true, 
      user, 
      userType: profileData.user_type,
      authorized: true 
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authenticated: false, error };
  }
};

// Helper to load user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data;
};

// Helper to load worker profile
export const getWorkerProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data;
};

// Helper to load worker profile with related profile data
export const getWorkerProfileWithDetails = async (userId: string) => {
  const { data, error } = await supabase
    .from('worker_profiles')
    .select(`
      *,
      profile:profiles!worker_profiles_id_fkey(*)
    `)
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data;
};
