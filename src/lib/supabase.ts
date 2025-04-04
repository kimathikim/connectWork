import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/supabase"

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
const testConnection = async () => {
  try {
    // Check if we can connect by querying an existing table instead of _rpc
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count(*)', { count: 'exact', head: true });

    if (connectionError) {
      console.error("Supabase connection error:", connectionError);
      return;
    }

    // If we get here, the connection is successful
    console.log("Supabase connection successful");

    // Then check if other essential tables exist
    const tables = ['worker_profiles', 'services', 'jobs', 'job_applications'];
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count(*)', { count: 'exact', head: true });

      if (tableError) {
        console.error(`Error checking ${table}:`, tableError);
      }
    }
  } catch (err) {
    console.error("Supabase test failed:", err);
  }
};

testConnection();

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
          profile:profiles(*)
        )
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
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

export const getServices = async () => {
  const { data, error } = await supabase.from("services").select("*").order("name")

  if (error) throw error
  return data
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

  let queryBuilder = supabase
    .from("worker_profiles")
    .select(`
      *,
      profile:profiles!worker_profiles_id_fkey(id, full_name, email, phone, location, avatar_url, latitude, longitude),
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
        // Skip workers without location coordinates
        if (!worker.profile?.latitude || !worker.profile?.longitude) {
          return false;
        }

        const distance = calculateDistance(
          coords.lat,
          coords.lon,
          worker.profile.latitude,
          worker.profile.longitude
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

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        ...appointmentData,
        status: appointmentData.status || "scheduled",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    console.error("Error creating appointment:", error)
    throw error
  }
}

export const getCustomerAppointments = async (customerId: string) => {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      job:jobs(*),
      worker:worker_profiles(
        profile:profiles(*)
      )
    `)
    .eq("customer_id", customerId)
    .order("date", { ascending: true })

  if (error) throw error
  return data
}

export const getWorkerAppointments = async (workerId: string) => {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      job:jobs(*),
      customer:profiles!customer_id(*)
    `)
    .eq("worker_id", workerId)
    .order("date", { ascending: true })

  if (error) throw error
  return data
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
