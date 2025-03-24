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
  } = {},
) => {
  let query = supabase
    .from("jobs")
    .select(`
      *,
      customer:profiles!customer_id(*),
      service:services(*),
      applications:job_applications(count)
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false })

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

  const { data, error } = await query

  if (error) throw error
  return data
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

// Add this helper function to handle profile queries
export const getUserType = async (userId: string) => {
  try {
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
            full_name: 'User',
            email: 'user@example.com', // Will be updated later
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
