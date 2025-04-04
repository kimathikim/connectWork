import { supabase } from './supabase';
import { uploadImage, deleteImage } from './image-upload';

/**
 * Basic profile data interface
 */
export interface ProfileData {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  address?: string;
  bio?: string;
  avatarUrl?: string;
  website?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
}

/**
 * Worker-specific profile data
 */
export interface WorkerProfileData {
  headline: string;
  hourlyRate: number;
  yearsExperience: number;
  availability?: {
    days: string[];
    hours: string;
  };
  skills: string[];
  certifications: {
    name: string;
    issueDate?: string;
    expiryDate?: string;
  }[];
  education?: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startDate: string;
    endDate?: string;
  }[];
  portfolio?: {
    title: string;
    description: string;
    imageUrl?: string;
    link?: string;
  }[];
  languages?: {
    language: string;
    proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
  }[];
}

/**
 * Customer-specific profile data
 */
export interface CustomerProfileData {
  preferredPaymentMethod?: string;
  preferredCommunication?: 'email' | 'phone' | 'app';
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    app: boolean;
  };
  savedLocations?: {
    name: string;
    address: string;
    isDefault: boolean;
  }[];
}

/**
 * Fetches the basic profile for a user
 * @param userId The user ID
 * @returns The basic profile data
 */
export const fetchBasicProfile = async (userId: string): Promise<ProfileData> => {
  try {
    // Get user data from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;

    // Get profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    return {
      fullName: profileData.full_name || '',
      email: user?.email || '',
      phone: profileData.phone || '',
      location: profileData.location || '',
      address: profileData.address || '',
      bio: profileData.bio || '',
      avatarUrl: profileData.avatar_url || '',
      website: profileData.website || '',
      socialLinks: profileData.social_links || {},
    };
  } catch (error) {
    console.error('Error fetching basic profile:', error);
    throw error;
  }
};

/**
 * Updates the basic profile for a user
 * @param userId The user ID
 * @param profileData The profile data to update
 * @param avatarFile Optional avatar file to upload
 * @returns The updated profile data
 */
export const updateBasicProfile = async (
  userId: string,
  profileData: ProfileData,
  avatarFile?: File
): Promise<ProfileData> => {
  try {
    let avatarUrl = profileData.avatarUrl;

    // If avatar file is provided, upload it
    if (avatarFile) {
      try {
        // If there's an existing avatar, delete it
        if (avatarUrl) {
          await deleteImage(avatarUrl);
        }

        // Upload new avatar
        avatarUrl = await uploadImage(avatarFile);
      } catch (uploadError) {
        console.error('Error handling profile image:', uploadError);
        // Continue with profile update even if image upload fails
      }
    }

    // Update profile in database
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileData.fullName,
        email: profileData.email, // Include email to satisfy not-null constraint
        phone: profileData.phone || null,
        location: profileData.location || null,
        address: profileData.address || null,
        bio: profileData.bio || null,
        avatar_url: avatarUrl || null,
        website: profileData.website || null,
        social_links: profileData.socialLinks || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Return updated profile
    return {
      ...profileData,
      avatarUrl
    };
  } catch (error) {
    console.error('Error updating basic profile:', error);
    throw error;
  }
};

/**
 * Fetches the worker profile for a user
 * @param userId The user ID
 * @returns The worker profile data
 */
export const fetchWorkerProfile = async (userId: string): Promise<WorkerProfileData> => {
  try {
    // Get worker profile
    const { data: workerData, error: workerError } = await supabase
      .from('worker_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (workerError && workerError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" error, which is fine for new workers
      throw workerError;
    }

    // Get skills
    const { data: skillsData } = await supabase
      .from('worker_skills')
      .select('skill')
      .eq('worker_id', userId);

    // Get certifications
    const { data: certsData } = await supabase
      .from('worker_certifications')
      .select('*')
      .eq('worker_id', userId);

    // Get education
    const { data: educationData } = await supabase
      .from('worker_education')
      .select('*')
      .eq('worker_id', userId);

    // Get portfolio
    const { data: portfolioData } = await supabase
      .from('worker_portfolio')
      .select('*')
      .eq('worker_id', userId);

    // Get languages
    const { data: languagesData } = await supabase
      .from('worker_languages')
      .select('*')
      .eq('worker_id', userId);

    // Get availability
    const { data: availabilityData } = await supabase
      .from('worker_availability')
      .select('*')
      .eq('worker_id', userId);

    // Format availability
    const availability = {
      days: Array.from(new Set(availabilityData?.map(a => a.day_of_week.toString()) || [])),
      hours: availabilityData && availabilityData.length > 0
        ? `${availabilityData[0].start_time} - ${availabilityData[0].end_time}`
        : ''
    };

    return {
      headline: workerData?.headline || '',
      hourlyRate: workerData?.hourly_rate || 0,
      yearsExperience: workerData?.years_experience || 0,
      availability,
      skills: skillsData?.map(s => s.skill) || [],
      certifications: certsData?.map(c => ({
        name: c.certification,
        issueDate: c.issue_date,
        expiryDate: c.expiry_date
      })) || [],
      education: educationData?.map(e => ({
        institution: e.institution,
        degree: e.degree,
        fieldOfStudy: e.field_of_study,
        startDate: e.start_date,
        endDate: e.end_date
      })) || [],
      portfolio: portfolioData?.map(p => ({
        title: p.title,
        description: p.description,
        imageUrl: p.image_url,
        link: p.link
      })) || [],
      languages: languagesData?.map(l => ({
        language: l.language,
        proficiency: l.proficiency as any
      })) || []
    };
  } catch (error) {
    console.error('Error fetching worker profile:', error);
    throw error;
  }
};

/**
 * Updates the worker profile for a user
 * @param userId The user ID
 * @param workerData The worker profile data to update
 * @returns The updated worker profile data
 */
export const updateWorkerProfile = async (
  userId: string,
  workerData: WorkerProfileData
): Promise<WorkerProfileData> => {
  try {
    // Update worker profile
    const { error: workerError } = await supabase
      .from('worker_profiles')
      .upsert({
        id: userId,
        headline: workerData.headline,
        hourly_rate: workerData.hourlyRate,
        years_experience: workerData.yearsExperience,
        updated_at: new Date().toISOString()
      });

    if (workerError) throw workerError;

    // Update skills
    if (workerData.skills && workerData.skills.length > 0) {
      // Delete existing skills
      await supabase
        .from('worker_skills')
        .delete()
        .eq('worker_id', userId);

      // Insert new skills
      await supabase
        .from('worker_skills')
        .insert(workerData.skills.map(skill => ({
          worker_id: userId,
          skill
        })));
    }

    // Update certifications
    if (workerData.certifications && workerData.certifications.length > 0) {
      // Delete existing certifications
      await supabase
        .from('worker_certifications')
        .delete()
        .eq('worker_id', userId);

      // Insert new certifications
      await supabase
        .from('worker_certifications')
        .insert(workerData.certifications.map(cert => ({
          worker_id: userId,
          certification: cert.name,
          issue_date: cert.issueDate,
          expiry_date: cert.expiryDate
        })));
    }

    // Update education
    if (workerData.education && workerData.education.length > 0) {
      // Delete existing education
      await supabase
        .from('worker_education')
        .delete()
        .eq('worker_id', userId);

      // Insert new education
      await supabase
        .from('worker_education')
        .insert(workerData.education.map(edu => ({
          worker_id: userId,
          institution: edu.institution,
          degree: edu.degree,
          field_of_study: edu.fieldOfStudy,
          start_date: edu.startDate,
          end_date: edu.endDate
        })));
    }

    // Update portfolio
    if (workerData.portfolio && workerData.portfolio.length > 0) {
      // Delete existing portfolio
      await supabase
        .from('worker_portfolio')
        .delete()
        .eq('worker_id', userId);

      // Insert new portfolio
      await supabase
        .from('worker_portfolio')
        .insert(workerData.portfolio.map(item => ({
          worker_id: userId,
          title: item.title,
          description: item.description,
          image_url: item.imageUrl,
          link: item.link
        })));
    }

    // Update languages
    if (workerData.languages && workerData.languages.length > 0) {
      // Delete existing languages
      await supabase
        .from('worker_languages')
        .delete()
        .eq('worker_id', userId);

      // Insert new languages
      await supabase
        .from('worker_languages')
        .insert(workerData.languages.map(lang => ({
          worker_id: userId,
          language: lang.language,
          proficiency: lang.proficiency
        })));
    }

    // Update availability
    if (workerData.availability && workerData.availability.days.length > 0) {
      // Delete existing availability
      await supabase
        .from('worker_availability')
        .delete()
        .eq('worker_id', userId);

      // Parse hours
      const [startTime, endTime] = workerData.availability.hours.split(' - ');

      // Insert new availability
      await supabase
        .from('worker_availability')
        .insert(workerData.availability.days.map(day => ({
          worker_id: userId,
          day_of_week: parseInt(day),
          start_time: startTime,
          end_time: endTime
        })));
    }

    return workerData;
  } catch (error) {
    console.error('Error updating worker profile:', error);
    throw error;
  }
};

/**
 * Fetches the customer profile for a user
 * @param userId The user ID
 * @returns The customer profile data
 */
export const fetchCustomerProfile = async (userId: string): Promise<CustomerProfileData> => {
  try {
    // Get customer preferences
    const { data: preferencesData, error: preferencesError } = await supabase
      .from('customer_preferences')
      .select('*')
      .eq('customer_id', userId)
      .single();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" error, which is fine for new customers
      throw preferencesError;
    }

    // Get saved locations
    const { data: locationsData } = await supabase
      .from('customer_locations')
      .select('*')
      .eq('customer_id', userId);

    return {
      preferredPaymentMethod: preferencesData?.preferred_payment_method || '',
      preferredCommunication: preferencesData?.preferred_communication as any || 'email',
      notificationPreferences: preferencesData?.notification_preferences || {
        email: true,
        sms: false,
        app: true
      },
      savedLocations: locationsData?.map(l => ({
        name: l.name,
        address: l.address,
        isDefault: l.is_default
      })) || []
    };
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    throw error;
  }
};

/**
 * Updates the customer profile for a user
 * @param userId The user ID
 * @param customerData The customer profile data to update
 * @returns The updated customer profile data
 */
export const updateCustomerProfile = async (
  userId: string,
  customerData: CustomerProfileData
): Promise<CustomerProfileData> => {
  try {
    // Update customer preferences
    const { error } = await supabase
      .from('customer_preferences')
      .upsert({
        customer_id: userId,
        preferred_payment_method: customerData.preferredPaymentMethod,
        preferred_communication: customerData.preferredCommunication,
        notification_preferences: customerData.notificationPreferences,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Update saved locations
    if (customerData.savedLocations && customerData.savedLocations.length > 0) {
      // Delete existing locations
      await supabase
        .from('customer_locations')
        .delete()
        .eq('customer_id', userId);

      // Insert new locations
      await supabase
        .from('customer_locations')
        .insert(customerData.savedLocations.map(loc => ({
          customer_id: userId,
          name: loc.name,
          address: loc.address,
          is_default: loc.isDefault
        })));
    }

    return customerData;
  } catch (error) {
    console.error('Error updating customer profile:', error);
    throw error;
  }
};

/**
 * Fetches the complete profile for a user
 * @param userId The user ID
 * @returns The complete profile data
 */
export const fetchCompleteProfile = async (userId: string) => {
  try {
    // Get basic profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Get user type
    const userType = profileData.user_type;

    // Get user data from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;

    // Initialize result object
    const result: {
      basic: ProfileData;
      worker?: WorkerProfileData;
      customer?: CustomerProfileData;
      userType: 'worker' | 'customer';
    } = {
      basic: {
        fullName: profileData.full_name || '',
        email: user?.email || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        address: profileData.address || '',
        bio: profileData.bio || '',
        avatarUrl: profileData.avatar_url || '',
        website: profileData.website || '',
        socialLinks: profileData.social_links || {},
      },
      userType: userType as 'worker' | 'customer',
    };

    // If worker, get worker profile
    if (userType === 'worker') {
      result.worker = await fetchWorkerProfile(userId);
    }

    // If customer, get customer profile
    if (userType === 'customer') {
      result.customer = await fetchCustomerProfile(userId);
    }

    return result;
  } catch (error) {
    console.error('Error fetching complete profile:', error);
    throw error;
  }
};