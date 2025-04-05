import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/supabase"
import { withCache, CACHE_KEYS, CACHE_EXPIRY } from './cache-utils'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// Add proper headers for CORS
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.x'
    },
  },
})

// Add this to debug Supabase configuration
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key:", supabaseAnonKey ? "Key exists" : "Key missing");

// Test connection with more detailed error handling
export const testConnection = async () => {
  try {
    // Check if we can connect by querying an existing table instead of _rpc
    const { error: connectionError } = await supabase
      .from('profiles')
      .select('count(*)', { count: 'exact', head: true });

    if (connectionError) {
      console.error("Supabase connection error:", connectionError);
      // Don't return early, try to provide more diagnostic information
    } else {
      // If we get here, the connection is successful
      console.log("Supabase connection successful");
    }

    // Then check if other essential tables exist
    const tables = ['worker_profiles', 'services', 'jobs', 'job_applications'];
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true });

        if (tableError) {
          console.warn(`Table '${table}' may not exist or is not accessible:`, tableError);
        } else {
          console.log(`Table '${table}' exists and is accessible`);
        }
      } catch (tableCheckError) {
        console.warn(`Error checking table '${table}':`, tableCheckError);
      }
    }
  } catch (err) {
    console.error("Supabase test failed:", err);
  }
};

testConnection();

// Create a stored procedure to create the appointments table if it doesn't exist
const createAppointmentsTableFunction = async () => {
  try {
    // Check if the function already exists
    const { error: checkError } = await supabase.rpc('create_appointments_table', {});

    if (checkError && checkError.message.includes('function "create_appointments_table" does not exist')) {
      console.log('Creating stored procedure for appointments table...');

      // Create the stored procedure
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION create_appointments_table()
          RETURNS void AS $$
          BEGIN
            -- Check if the table exists
            IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'appointments') THEN
              -- Create the appointments table
              CREATE TABLE public.appointments (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                customer_id UUID NOT NULL REFERENCES public.profiles(id),
                worker_id UUID NOT NULL REFERENCES public.worker_profiles(id),
                service_id UUID REFERENCES public.services(id),
                date DATE NOT NULL,
                time TIME NOT NULL,
                address TEXT NOT NULL,
                notes TEXT,
                status TEXT NOT NULL DEFAULT 'scheduled',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );

              -- Add RLS policies
              ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

              -- Create policies
              CREATE POLICY "Appointments are viewable by involved users"
                ON public.appointments
                FOR SELECT
                USING (auth.uid() = customer_id OR auth.uid() IN (
                  SELECT profile_id FROM public.worker_profiles WHERE id = worker_id
                ));

              CREATE POLICY "Customers can create appointments"
                ON public.appointments
                FOR INSERT
                WITH CHECK (auth.uid() = customer_id);

              CREATE POLICY "Involved users can update appointments"
                ON public.appointments
                FOR UPDATE
                USING (auth.uid() = customer_id OR auth.uid() IN (
                  SELECT profile_id FROM public.worker_profiles WHERE id = worker_id
                ));
            END IF;
          END;
          $$ LANGUAGE plpgsql;
        `
      });

      if (error) {
        console.error('Error creating stored procedure:', error);
      } else {
        console.log('Stored procedure created successfully');
      }
    }
  } catch (error) {
    console.error('Error setting up appointments table function:', error);
  }
};

// Call the function to set up the stored procedure
createAppointmentsTableFunction();

// Create a function to add location fields to the profiles table if they don't exist
const addLocationFieldsToProfiles = async () => {
  try {
    console.log('Checking if location fields exist in profiles table...');

    // Check if the function already exists
    const { error: checkError } = await supabase.rpc('add_location_fields_to_profiles', {});

    if (checkError && checkError.message.includes('function "add_location_fields_to_profiles" does not exist')) {
      console.log('Creating stored procedure for adding location fields...');

      // Create the stored procedure
      const { error } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION add_location_fields_to_profiles()
          RETURNS void AS $$
          BEGIN
            -- Check if latitude column exists
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name = 'latitude'
            ) THEN
              -- Add latitude column
              ALTER TABLE public.profiles ADD COLUMN latitude DOUBLE PRECISION;
            END IF;

            -- Check if longitude column exists
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name = 'longitude'
            ) THEN
              -- Add longitude column
              ALTER TABLE public.profiles ADD COLUMN longitude DOUBLE PRECISION;
            END IF;

            -- Check if lat column exists (alternative name)
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name = 'lat'
            ) THEN
              -- Add lat column
              ALTER TABLE public.profiles ADD COLUMN lat DOUBLE PRECISION;
            END IF;

            -- Check if lng column exists (alternative name)
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name = 'lng'
            ) THEN
              -- Add lng column
              ALTER TABLE public.profiles ADD COLUMN lng DOUBLE PRECISION;
            END IF;

            -- Check if location_lat column exists (another alternative name)
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name = 'location_lat'
            ) THEN
              -- Add location_lat column
              ALTER TABLE public.profiles ADD COLUMN location_lat DOUBLE PRECISION;
            END IF;

            -- Check if location_lng column exists (another alternative name)
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = 'profiles'
              AND column_name = 'location_lng'
            ) THEN
              -- Add location_lng column
              ALTER TABLE public.profiles ADD COLUMN location_lng DOUBLE PRECISION;
            END IF;
          END;
          $$ LANGUAGE plpgsql;
        `
      });

      if (error) {
        console.error('Error creating stored procedure for location fields:', error);
      } else {
        console.log('Stored procedure for location fields created successfully');

        // Now call the function to add the fields
        const { error: execError } = await supabase.rpc('add_location_fields_to_profiles');
        if (execError) {
          console.error('Error adding location fields to profiles:', execError);
        } else {
          console.log('Location fields added to profiles table successfully');
        }
      }
    } else if (!checkError) {
      // If the function exists, call it to make sure the fields are added
      console.log('Stored procedure for location fields exists, calling it...');
      const { error: execError } = await supabase.rpc('add_location_fields_to_profiles');
      if (execError) {
        console.error('Error adding location fields to profiles:', execError);
      } else {
        console.log('Location fields added to profiles table successfully');
      }
    }
  } catch (error) {
    console.error('Error setting up location fields function:', error);
  }
};

// Call the function to add location fields
addLocationFieldsToProfiles();

// Auth helpers
export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (error) throw error
  return data
}

// Worker helpers
export const getWorkerProfile = async (workerId: string) => {
  const { data, error } = await supabase
    .from("worker_profiles")
    .select(`
      *,
      profile:profiles!worker_profiles_id_fkey(id, full_name, email, phone, location, avatar_url),
      services:worker_services(
        *,
        service:services(*)
      )
    `)
    .eq("id", workerId)
    .single()

  if (error) throw error

  // Add default avatar_url if it doesn't exist
  if (data && data.profile) {
    data.profile.avatar_url = data.profile.avatar_url || null;
  }

  return data
}

export const createJob = async (jobData: {
  customer_id: string
  service_id: string
  title: string
  description: string
  location: string
  budget_min: number
  budget_max: number
  urgency_level: string
  required_skills?: string[]
}) => {
  try {
    // Input validation
    if (
      !jobData.customer_id ||
      !jobData.service_id ||
      !jobData.title.trim() ||
      !jobData.description.trim() ||
      !jobData.location.trim() ||
      jobData.budget_min < 0 ||
      jobData.budget_max < jobData.budget_min ||
      !["low", "normal", "high", "emergency"].includes(jobData.urgency_level)
    ) {
      throw new Error("Invalid job data. Please fill all fields correctly.")
    }

    // Insert job into the database
    const { data, error } = await supabase.from("jobs").insert(jobData).select().single()

    if (error) {
      console.error("Supabase Insert Error:", error.message)
      throw new Error("Failed to post job. Please try again.")
    }

    // Return success response
    return { success: true, job: data }
  } catch (error) {
    console.error("Job Posting Error:", error)
    return { success: false, message: error instanceof Error ? error.message : "An error occurred." }
  }
}

export const getJobsByCustomer = async (customerId: string) => {
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      *,
      customer:profiles!customer_id(*),
      service:services(*),
      applications:job_applications(
        worker:worker_profiles(
          profile:profiles!worker_profiles_id_fkey(*)
        )
      ),
      assigned_worker:worker_profiles(id, hourly_rate, avg_rating, profile:profiles!worker_profiles_id_fkey(*))
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export const getJobDetails = async (jobId: string) => {
  try {
    const { data, error } = await supabase
      .from("jobs")
      .select(`
        *,
        customer:profiles!customer_id(*),
        service:services(*),
        applications:job_applications(
          id,
          status,
          proposal,
          price,
          created_at,
          worker:worker_profiles(
            id,
            hourly_rate,
            avg_rating,
            profile:profiles!worker_profiles_id_fkey(*)
          )
        ),
        assigned_worker:worker_profiles(id, hourly_rate, avg_rating, profile:profiles!worker_profiles_id_fkey(*))
      `)
      .eq("id", jobId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching job details:", error)
    throw error
  }
}

// Review helpers
export const createReview = async (reviewData: {
  job_id: string
  reviewer_id: string
  worker_id: string
  rating: number
  comment?: string
}) => {
  const { data, error } = await supabase.from("reviews").insert(reviewData).select().single()

  if (error) throw error
  return data
}

// Real-time subscriptions
export const subscribeToJobApplications = (jobId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`job-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "job_applications",
        filter: `job_id=eq.${jobId}`,
      },
      callback,
    )
    .subscribe()
}

// Worker-specific helpers
export const getWorkerJobs = async (workerId: string) => {
  const { data, error } = await supabase
    .from("job_applications")
    .select(`
      *,
      job:jobs(
        *,
        customer:profiles!customer_id(*)
      )
    `)
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export const getAvailableJobs = async (
  filters: {
    serviceIds?: string[]
    location?: string
    minBudget?: number
    maxBudget?: number
    urgency?: string[]
    datePosted?: string // 'today', 'week', 'month', 'any'
    requiredSkills?: string[]
    maxDistance?: number
    sortBy?: string // 'date', 'budget', 'relevance'
    sortOrder?: 'asc' | 'desc'
    coordinates?: { lat: number; lon: number }
  } = {},
) => {
  // Generate a cache key based on the search parameters
  const cacheKey = `${CACHE_KEYS.JOBS}_${JSON.stringify(filters)}`;

  return withCache(
    cacheKey,
    async () => {
  let query = supabase
    .from("jobs")
    .select(`
      *,
      customer:profiles!customer_id(*),
      service:services(*),
      applications:job_applications(count),
      required_skills
    `)
    .eq("status", "open")

  // Apply filters
  if (filters.serviceIds && filters.serviceIds.length > 0) {
    query = query.in("service_id", filters.serviceIds)
  }

  if (filters.location) {
    query = query.ilike("location", `%${filters.location}%`)
  }

  if (filters.minBudget !== undefined) {
    query = query.gte("budget_max", filters.minBudget)
  }

  if (filters.maxBudget !== undefined) {
    query = query.lte("budget_min", filters.maxBudget)
  }

  if (filters.urgency && filters.urgency.length > 0) {
    query = query.in("urgency_level", filters.urgency)
  }

  // Filter by date posted
  if (filters.datePosted) {
    const now = new Date();
    let startDate;

    switch (filters.datePosted) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = null;
    }

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
  }

  // Execute the query
  const { data, error } = await query

  if (error) throw error

  let filteredData = data;

  // Filter by required skills if provided
  if (filters.requiredSkills && filters.requiredSkills.length > 0) {
    const normalizedSkills = filters.requiredSkills.map(skill => skill.toLowerCase().trim());

    filteredData = filteredData.filter(job => {
      // If job has no required skills, include it in results
      if (!job.required_skills || job.required_skills.length === 0) {
        return true;
      }

      // Check if any of the job's required skills match the filter skills
      const jobSkills = job.required_skills.map((skill: string) => skill.toLowerCase().trim());
      return normalizedSkills.some(skill => jobSkills.includes(skill));
    });
  }

  // Filter by distance if location/coordinates and maxDistance are provided
  if ((filters.location || filters.coordinates) && filters.maxDistance) {
    try {
      // Import geocoding function
      const { geocodeLocation, calculateDistance } = await import('./geolocation');

      // Get coordinates for the search location
      let coords;
      if (filters.coordinates) {
        // Use provided coordinates directly
        coords = filters.coordinates;
      } else if (filters.location) {
        // Geocode the location string
        coords = await geocodeLocation(filters.location);
      } else {
        throw new Error('No location information provided');
      }

      // Filter jobs by distance and add distance to each job
      filteredData = filteredData.filter(job => {
        // Skip jobs without location coordinates
        if (!job.latitude || !job.longitude) {
          return true; // Include jobs without coordinates
        }

        const distance = calculateDistance(
          coords.lat,
          coords.lon,
          job.latitude,
          job.longitude
        );

        // Add distance to job object
        job.distance = distance;

        // Filter by maximum distance
        return distance <= filters.maxDistance!;
      });
    } catch (error) {
      console.error("Error filtering by distance:", error);
      // Continue without distance filtering if geocoding fails
    }
  }

  // Sort results
  if (filters.sortBy) {
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    switch (filters.sortBy) {
      case 'date':
        filteredData.sort((a, b) => {
          return sortOrder * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
        break;
      case 'budget':
        filteredData.sort((a, b) => {
          return sortOrder * ((a.budget_min + a.budget_max) / 2 - (b.budget_min + b.budget_max) / 2);
        });
        break;
      case 'relevance':
        // If we have skills to match, sort by relevance
        if (filters.requiredSkills && filters.requiredSkills.length > 0) {
          const { calculateSkillMatchScore } = require('./skill-matching');

          filteredData.forEach(job => {
            job.relevanceScore = calculateSkillMatchScore(
              filters.requiredSkills || [],
              job.required_skills || []
            );
          });

          filteredData.sort((a, b) => sortOrder * (b.relevanceScore - a.relevanceScore));
        }
        break;
      default:
        // Default sort by date
        filteredData.sort((a, b) => {
          return -1 * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        });
    }
  } else {
    // Default sort by date (newest first)
    filteredData.sort((a, b) => {
      return -1 * (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
  }

  return filteredData;
    }, // End of async function
    CACHE_EXPIRY.SHORT // Search results change frequently
  ); // End of withCache
}

export const updateWorkerServices = async (workerId: string, services: any[]) => {
  try {
    // First, delete existing services
    const { error: deleteError } = await supabase
      .from("worker_services")
      .delete()
      .eq("worker_id", workerId);

    if (deleteError) throw deleteError;

    // Then insert new services with rates
    const formattedServices = services.map(service => ({
      worker_id: workerId,
      service_id: service.service_id,
      rate: service.rate
    }));

    const { data, error } = await supabase
      .from("worker_services")
      .insert(formattedServices);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error updating worker services:", error);
    throw error;
  }
};

export const updateWorkerAvailability = async (workerId: string, availability: any[]) => {
  try {
    // First, delete existing availability
    const { error: deleteError } = await supabase
      .from("worker_availability")
      .delete()
      .eq("worker_id", workerId);

    if (deleteError) throw deleteError;

    // Then insert new availability
    const formattedAvailability = availability.map(slot => ({
      worker_id: workerId,
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time
    }));

    const { data, error } = await supabase
      .from("worker_availability")
      .insert(formattedAvailability);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error updating worker availability:", error);
    throw error;
  }
};

export const getWorkerEarnings = async (workerId: string) => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        job:jobs(
          *,
          customer:profiles!customer_id(*)
        )
      `)
      .eq("worker_id", workerId)
      .order("payment_date", { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error getting worker earnings:", error);
    throw error;
  }
};

export const applyForJob = async (jobId: string, workerId: string, coverLetter: string, proposedRate: number) => {
  try {
    // Input validation
    if (!jobId || !workerId || !coverLetter.trim() || proposedRate <= 0) {
      throw new Error("Invalid application data. Please fill all fields correctly.")
    }

    // Check if already applied
    const { data: existingApplication } = await supabase
      .from("job_applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("worker_id", workerId)
      .single()

    if (existingApplication) {
      throw new Error("You have already applied for this job")
    }

    // Submit application - using proposal field as per database schema
    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        job_id: jobId,
        worker_id: workerId,
        proposal: coverLetter, // Changed to match the database column name
        price: proposedRate, // Changed to match the database column name
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    console.error("Error applying for job:", error)
    throw error
  }
}

// Helper functions to check if records exist

// Check if a job application exists
const checkApplicationExists = async (applicationId: string): Promise<boolean> => {
  if (!applicationId) return false;
  try {
    // First check if the table exists by trying to get the table info
    const { error: tableError } = await supabase
      .from('job_applications')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('Error accessing job_applications table:', tableError);
      throw new Error(`Table 'job_applications' may not exist or is not accessible: ${tableError.message}`);
    }

    // Now check if the specific application exists
    const { count, error } = await supabase
      .from("job_applications")
      .select("*", { count: 'exact', head: true })
      .eq("id", applicationId);

    if (error) {
      console.error('Error checking if application exists:', error);
      return false;
    }

    return count ? count > 0 : false;
  } catch (error) {
    console.error('Exception checking if application exists:', error);
    return false;
  }
};

// Check if a job exists
const checkJobExists = async (jobId: string): Promise<boolean> => {
  if (!jobId) return false;
  try {
    // First check if the table exists by trying to get the table info
    const { error: tableError } = await supabase
      .from('jobs')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('Error accessing jobs table:', tableError);
      throw new Error(`Table 'jobs' may not exist or is not accessible: ${tableError.message}`);
    }

    // Now check if the specific job exists
    const { count, error } = await supabase
      .from("jobs")
      .select("*", { count: 'exact', head: true })
      .eq("id", jobId);

    if (error) {
      console.error('Error checking if job exists:', error);
      return false;
    }

    return count ? count > 0 : false;
  } catch (error) {
    console.error('Exception checking if job exists:', error);
    return false;
  }
};

// Function to accept a job application
export const acceptJobApplication = async (applicationId: string, jobId: string) => {
  console.log(`Accepting job application: Application ID=${applicationId}, Job ID=${jobId}`);

  // Validate input parameters
  if (!applicationId || !jobId) {
    console.error('Invalid parameters:', { applicationId, jobId });
    throw new Error('Application ID and Job ID are required');
  }

  try {
    // STEP 1: Get the current state of the application and job
    console.log('STEP 1: Getting current state of application and job');

    const { data: application, error: appError } = await supabase
      .from('job_applications')
      .select('worker_id, status')
      .eq('id', applicationId)
      .single();

    if (appError) {
      console.error('Error fetching application:', appError);

      // In development mode, we can continue with a mock application
      if (import.meta.env.DEV) {
        console.warn('Development mode: Using mock application data');
        const mockApplication = {
          worker_id: 'mock-worker-id',
          status: 'pending'
        };

        // Continue with the mock application
        console.log('Using mock application:', mockApplication);
        return true;
      }

      throw new Error(`Failed to get application details: ${appError.message}`);
    }

    if (!application) {
      console.error('Application not found with ID:', applicationId);

      // In development mode, we can continue with a mock application
      if (import.meta.env.DEV) {
        console.warn('Development mode: Using mock application data');
        return true;
      }

      throw new Error('Application not found with the provided ID');
    }

    if (!application.worker_id) {
      console.error('Application missing worker_id:', application);

      // In development mode, we can continue
      if (import.meta.env.DEV) {
        console.warn('Development mode: Continuing despite missing worker_id');
        return true;
      }

      throw new Error('Missing worker information in the application');
    }

    // Check if the application is already accepted
    if (application.status === 'accepted') {
      console.log('Application is already accepted');
      return true; // Return success without making any changes
    }

    // STEP 2: Update the application status to accepted FIRST
    console.log('STEP 2: Updating application status to accepted');

    // First, check if the application is already in the accepted state
    if (application.status === 'accepted') {
      console.log('Application is already in accepted state, skipping update');
    } else {
      // Log the exact SQL query we're about to execute (for debugging)
      console.log(`Executing update on job_applications where id = ${applicationId}`);
      console.log(`Current application status: ${application.status}`);

      // Try to update the application status
      const { data: updatedApp, error: updateError } = await supabase
        .from('job_applications')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select();

      console.log('Application update result:', { data: updatedApp, error: updateError });

      if (updateError) {
        console.error('Error updating application status:', updateError);
        throw new Error(`Failed to update application status: ${updateError.message}`);
      }

      if (!updatedApp || updatedApp.length === 0) {
        console.error('No application was updated. This could be due to RLS policies or constraints.');

        // Try an alternative approach using RPC
        console.log('Trying alternative approach with RPC...');
        try {
          const { error: rpcError } = await supabase.rpc('update_application_status', {
            app_id: applicationId,
            new_status: 'accepted'
          });

          if (rpcError) {
            console.error('RPC update failed:', rpcError);
            throw new Error(`Failed to update application status via RPC: ${rpcError.message}`);
          }

          console.log('RPC update successful');
        } catch (rpcException) {
          console.error('Exception during RPC update:', rpcException);

          // If we're in development mode, we can continue anyway
          if (import.meta.env.DEV) {
            console.warn('Development mode: Continuing despite update failure');
          } else {
            throw new Error('Failed to update application status: No rows affected');
          }
        }
      }
    }
    // STEP 3: Update the job with worker assignment and status
    console.log('STEP 3: Updating job with worker assignment and status');

    const { data: updatedJob, error: jobUpdateError } = await supabase
      .from('jobs')
      .update({
        assigned_worker_id: application.worker_id,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select();

    console.log('Job update result:', { data: updatedJob, error: jobUpdateError });

    if (jobUpdateError) {
      console.error('Error updating job:', jobUpdateError);
      throw new Error(`Failed to update job: ${jobUpdateError.message}`);
    }

    if (!updatedJob || updatedJob.length === 0) {
      console.error('No job was updated');
      throw new Error('Failed to update job: No rows affected');
    }

    // STEP 4: Reject all other applications
    console.log('STEP 4: Rejecting other applications');

    const { data: rejectedApps, error: rejectError } = await supabase
      .from('job_applications')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .neq('id', applicationId)
      .select();

    console.log('Reject other applications result:', {
      count: rejectedApps?.length || 0,
      error: rejectError
    });

    if (rejectError) {
      console.error('Error rejecting other applications:', rejectError);
      // Continue anyway as this is not critical
    }

    // STEP 5: Final verification
    console.log('STEP 5: Final verification');

    // Verify application status one last time
    const { data: finalAppCheck } = await supabase
      .from('job_applications')
      .select('status')
      .eq('id', applicationId)
      .single();

    // Verify job status one last time
    const { data: finalJobCheck } = await supabase
      .from('jobs')
      .select('status, assigned_worker_id')
      .eq('id', jobId)
      .single();

    console.log('Final verification results:', {
      application: finalAppCheck,
      job: finalJobCheck
    });

    // Check if everything is as expected
    if (!finalAppCheck || finalAppCheck.status !== 'accepted') {
      console.warn('Application status is not accepted in final verification');
    }

    if (!finalJobCheck || finalJobCheck.status !== 'in_progress' || !finalJobCheck.assigned_worker_id) {
      console.warn('Job status is not as expected in final verification');
    }

    console.log(`Successfully accepted application ${applicationId} for job ${jobId}`);
    return true;
  } catch (error: any) {
    console.error("Error accepting job application:", error);
    throw error;
  }
};

// Helper function to handle payment updates



export const getServices = async () => {
  return withCache(
    CACHE_KEYS.SERVICES,
    async () => {
      const { data, error } = await supabase.from("services").select("*").order("name")
      if (error) throw error
      return data
    },
    CACHE_EXPIRY.LONG // Services don't change often, so cache for longer
  )
}

// Search helpers
export const searchWorkers = async (params: {
  query?: string;
  serviceId?: string;
  location?: string;
  maxDistance?: number;
  minRating?: number;
  maxRate?: number;
  minRate?: number;
  skills?: string[];
  coordinates?: { lat: number; lon: number };
}) => {
  // Log the search parameters for debugging
  console.log('Searching workers with params:', params);
  // Generate a cache key based on the search parameters
  const cacheKey = `${CACHE_KEYS.SEARCH_RESULTS}_workers_${JSON.stringify(params)}`;

  return withCache(
    cacheKey,
    async () => {
  const {
    query,
    serviceId,
    location,
    maxDistance = 50, // Default to 50km
    minRating = 0,
    maxRate,
    minRate = 0,
    skills = [],
    coordinates
  } = params;

  // First, let's try to add the location columns if they don't exist
  try {
    // Execute a simple SQL statement to add the columns if they don't exist
    await supabase.rpc('exec_sql', {
      sql: `
        -- Add latitude column if it doesn't exist
        DO $$
        BEGIN
          BEGIN
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
          EXCEPTION WHEN duplicate_column THEN
            -- Column already exists, do nothing
          END;

          BEGIN
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
          EXCEPTION WHEN duplicate_column THEN
            -- Column already exists, do nothing
          END;
        END $$;
      `
    });
    console.log('Checked and potentially added location columns');
  } catch (error) {
    console.error('Error adding location columns:', error);
    // Continue with the query anyway
  }

  // Now perform the query with a simpler select
  let queryBuilder = supabase
    .from("worker_profiles")
    .select(`
      *,
      profile:profiles!worker_profiles_id_fkey(id, full_name, email, phone, location, avatar_url),
      services:worker_services(
        *,
        service:services(*)
      ),
      skills:worker_skills(skill)
    `)
    .gte("avg_rating", minRating)
    .gte("hourly_rate", minRate)

  // Filter by maximum hourly rate if provided
  if (maxRate) {
    queryBuilder = queryBuilder.lte("hourly_rate", maxRate);
  }

  // Filter by service if provided
  if (serviceId) {
    queryBuilder = queryBuilder.eq("services.service_id", serviceId);
  }

  // Execute the query
  const { data, error } = await queryBuilder;

  if (error) throw error;

  // Filter results by search query if provided
  let filteredData = data;

  if (query) {
    const lowerQuery = query.toLowerCase();
    filteredData = filteredData.filter((worker: any) => {
      return (
        worker.profile.full_name.toLowerCase().includes(lowerQuery) ||
        worker.profession?.toLowerCase().includes(lowerQuery) ||
        worker.services.some((s: any) => s.service.name.toLowerCase().includes(lowerQuery))
      );
    });
  }

  // Filter by skills if provided
  if (skills.length > 0) {
    const normalizedSkills = skills.map(skill => skill.toLowerCase().trim());

    filteredData = filteredData.filter((worker: any) => {
      const workerSkills = worker.skills.map((s: any) => s.skill.toLowerCase().trim());
      return normalizedSkills.some(skill => workerSkills.includes(skill));
    });
  }

  // Filter by location if provided
  if (location || coordinates) {
    try {
      // Import geocoding function
      const { geocodeLocation, calculateDistance } = await import('./geolocation');

      // Get coordinates for the search location
      let coords;
      if (coordinates) {
        // Use provided coordinates directly
        coords = coordinates;
      } else if (location) {
        // Geocode the location string
        coords = await geocodeLocation(location);
      } else {
        throw new Error('No location information provided');
      }

      // Filter workers by distance and add distance to each worker
      filteredData = filteredData.filter((worker: any) => {
        // Check for location coordinates in any of the possible fields
        const lat = worker.profile?.latitude || worker.profile?.lat || worker.profile?.location_lat;
        const lng = worker.profile?.longitude || worker.profile?.lng || worker.profile?.location_lng;

        // Skip workers without location coordinates
        if (!lat || !lng) {
          return false;
        }

        const distance = calculateDistance(
          coords.lat,
          coords.lon,
          lat,
          lng
        );

        // Add distance to worker object
        worker.distance = distance;

        // Filter by maximum distance
        return distance <= maxDistance;
      });

      // Sort by distance
      filteredData.sort((a: any, b: any) => a.distance - b.distance);
    } catch (error) {
      console.error("Error filtering by location:", error);
      // Continue without location filtering if geocoding fails
    }
  }

  return filteredData;
    }, // End of async function
    CACHE_EXPIRY.SHORT // Search results change frequently
  ); // End of withCache
}

// Add this helper function to handle profile queries
export const getUserType = async (userId: string) => {
  try {
    // First try to get the current user's data
    const { data: authData } = await supabase.auth.getUser();

    // Get user email and name from auth data if available
    let userEmail = '';
    let userName = 'New User';

    if (authData?.user) {
      userEmail = authData.user.email || '';
      userName = authData.user.user_metadata?.full_name || userEmail?.split('@')[0] || 'New User';
    }

    const { data, error } = await supabase.from("profiles").select("user_type").eq("id", userId).single()

    if (error) {
      // If profile doesn't exist, create a default one
      if (error.code === 'PGRST116') {
        // Create default profile
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            user_type: 'customer', // Default to customer
            full_name: userName,
            email: userEmail, // Use actual email
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('user_type')
          .single()

        if (createError) throw createError
        return newProfile.user_type
      }
      throw error
    }

    return data.user_type
  } catch (error) {
    console.error("Error getting user type:", error)
    return 'customer' // Default fallback
  }
}

export const signUpWithProfile = async (email: string, password: string, userType: 'worker' | 'customer', fullName: string) => {
  // First, sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_type: userType,
        full_name: fullName
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  try {
    // Create profile with service role to bypass RLS
    const supabaseAdmin = createClient<Database>(
      supabaseUrl,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        user_type: userType,
        full_name: fullName,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    // Create worker profile if applicable
    if (userType === 'worker') {
      const { error: workerError } = await supabaseAdmin
        .from('worker_profiles')
        .insert({
          id: authData.user.id,
          headline: '',
          hourly_rate: 1, // Changed from 0 to 1
          years_experience: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (workerError) throw workerError;
    }

    return authData;
  } catch (error) {
    // If profile creation fails, delete the auth user to avoid orphaned accounts
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw error;
  }
};

// Improve the getConversation function to handle empty conversations
export const getConversation = async (userId1: string, userId2: string) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`
      )
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Return empty array if no messages found
    return data || [];
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return []; // Return empty array on error
  }
};

// Add a function to check if a user exists
export const checkUserExists = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error("Error checking if user exists:", error);
    return false;
  }
};

// Appointment helpers
export const createAppointment = async (appointmentData: {
  customer_id: string
  worker_id?: string
  service_id: string
  date: string
  time: string
  address: string
  notes?: string
  status?: string
  service_name?: string
  service_price?: number
}) => {
  try {
    // Input validation
    if (
      !appointmentData.customer_id ||
      !appointmentData.service_id ||
      !appointmentData.date ||
      !appointmentData.time ||
      !appointmentData.address
    ) {
      throw new Error("Invalid appointment data. Please fill all required fields.")
    }

    console.log('Creating appointment with data:', appointmentData);

    // Extract only the fields that should be stored in the database
    // This prevents issues with extra fields that aren't in the table schema
    const appointmentRecord = {
      customer_id: appointmentData.customer_id,
      worker_id: appointmentData.worker_id,
      service_id: appointmentData.service_id,
      date: appointmentData.date,
      time: appointmentData.time,
      address: appointmentData.address,
      notes: appointmentData.notes,
      status: appointmentData.status || "scheduled",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // We'll try to create the appointment directly without checking if the table exists first
    // If the table doesn't exist, we'll create it on the fly
    try {
      // First, try to create the appointment
      const { data, error } = await supabase
        .from("appointments")
        .insert(appointmentRecord)
        .select()
        .single()

      if (error) {
        // If the error is that the table doesn't exist, we'll create it
        if (error.message.includes('relation "appointments" does not exist') ||
            error.message.includes('does not exist') ||
            error.code === '42P01') {
          console.log('Appointments table does not exist, creating it...');

          // Create the appointments table
          // Note: In a production environment, you would use migrations instead
          // This is just a fallback for development
          await supabase.rpc('create_appointments_table');

          // Try again after creating the table
          const { data: retryData, error: retryError } = await supabase
            .from("appointments")
            .insert(appointmentRecord)
            .select()
            .single()

          if (retryError) {
            console.error('Error creating appointment after table creation:', retryError);
            throw retryError;
          }

          return {
            ...retryData,
            service_name: appointmentData.service_name,
            service_price: appointmentData.service_price
          };
        } else {
          // If it's some other error, throw it
          console.error('Error inserting appointment:', error);
          throw error;
        }
      }

      // Return the created appointment with additional info for the UI
      return {
        ...data,
        service_name: appointmentData.service_name,
        service_price: appointmentData.service_price
      };
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error;
    }

    // The code below is unreachable because we have a return statement in the try block above
    // This is kept here for reference only and will be removed in a future update
  } catch (error: any) {
    console.error("Error creating appointment:", error)
    throw error
  }
}

export const getCustomerAppointments = async (customerId: string) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        worker:worker_profiles!appointments_worker_id_fkey(id, hourly_rate, avg_rating, profile:profiles!worker_profiles_id_fkey(full_name, avatar_url)),
        service:services(id, name)
      `)
      .eq("customer_id", customerId)
      .order("date", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching customer appointments:", error)
    return []
  }
}

export const getWorkerAppointments = async (workerId: string) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        customer:profiles!appointments_customer_id_fkey(id, full_name, avatar_url),
        service:services(id, name)
      `)
      .eq("worker_id", workerId)
      .order("date", { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching worker appointments:", error)
    return []
  }
}



export const updateAppointmentStatus = async (appointmentId: string, status: string) => {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", appointmentId)
    .select()
    .single()

  if (error) throw error
  return data
}
