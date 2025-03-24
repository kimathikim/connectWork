export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          avatar_url: string | null
          email: string
          phone: string | null
          location: string | null
          address: string | null
          bio: string | null
          user_type: "customer" | "worker"
          created_at: string
          updated_at: string | null
          last_seen: string | null
        }
        Insert: {
          id: string
          full_name: string
          avatar_url?: string | null
          email: string
          phone?: string | null
          location?: string | null
          address?: string | null
          bio?: string | null
          user_type: "customer" | "worker"
          created_at?: string
          updated_at?: string | null
          last_seen?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          avatar_url?: string | null
          email?: string
          phone?: string | null
          location?: string | null
          address?: string | null
          bio?: string | null
          user_type?: "customer" | "worker"
          created_at?: string
          updated_at?: string | null
          last_seen?: string | null
        }
      }
      worker_profiles: {
        Row: {
          id: string
          profession: string
          hourly_rate: number
          years_experience: number
          rating: number | null
          review_count: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id: string
          profession: string
          hourly_rate: number
          years_experience: number
          rating?: number | null
          review_count?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          profession?: string
          hourly_rate?: number
          years_experience?: number
          rating?: number | null
          review_count?: number
          created_at?: string
          updated_at?: string | null
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          created_at?: string
        }
      }
      worker_services: {
        Row: {
          id: string
          worker_id: string
          service_id: string
          rate: number
          created_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          service_id: string
          rate: number
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          service_id?: string
          rate?: number
          created_at?: string
        }
      }
      worker_availability: {
        Row: {
          id: string
          worker_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          worker_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          id?: string
          worker_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          created_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          customer_id: string
          service_id: string
          title: string
          description: string
          location: string
          budget_min: number
          budget_max: number
          urgency_level: string
          status: string
          payment_status: string | null
          assigned_worker_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          service_id: string
          title: string
          description: string
          location: string
          budget_min: number
          budget_max: number
          urgency_level: string
          status?: string
          payment_status?: string | null
          assigned_worker_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          service_id?: string
          title?: string
          description?: string
          location?: string
          budget_min?: number
          budget_max?: number
          urgency_level?: string
          status?: string
          payment_status?: string | null
          assigned_worker_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      job_applications: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          status: string
          proposal: string | null
          price: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          worker_id: string
          status?: string
          proposal?: string | null
          price: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string
          status?: string
          proposal?: string | null
          price?: number
          created_at?: string
          updated_at?: string | null
        }
      }
      reviews: {
        Row: {
          id: string
          job_id: string
          reviewer_id: string
          worker_id: string
          rating: number
          comment: string | null
          helpful_count: number
          unhelpful_count: number
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          reviewer_id: string
          worker_id: string
          rating: number
          comment?: string | null
          helpful_count?: number
          unhelpful_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          reviewer_id?: string
          worker_id?: string
          rating?: number
          comment?: string | null
          helpful_count?: number
          unhelpful_count?: number
          created_at?: string
        }
      }
   
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      worker_skills: {
        Row: {
          worker_id: string
          skill: string
          created_at: string
        }
        Insert: {
          worker_id: string
          skill: string
          created_at?: string
        }
        Update: {
          worker_id?: string
          skill?: string
          created_at?: string
        }
      }
      worker_certifications: {
        Row: {
          worker_id: string
          certification: string
          issue_date: string | null
          expiry_date: string | null
          created_at: string
        }
        Insert: {
          worker_id: string
          certification: string
          issue_date?: string | null
          expiry_date?: string | null
          created_at?: string
        }
        Update: {
          worker_id?: string
          certification?: string
          issue_date?: string | null
          expiry_date?: string | null
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          job_id: string
          customer_id: string
          worker_id: string
          amount: number
          payment_method: string
          status: string
          payment_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          customer_id: string
          worker_id: string
          amount: number
          payment_method: string
          status: string
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          customer_id?: string
          worker_id?: string
          amount?: number
          payment_method?: string
          status?: string
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          job_id: string
          worker_id: string | null
          customer_id: string
          date: string
          time: string
          address: string
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          worker_id?: string | null
          customer_id: string
          date: string
          time: string
          address: string
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string | null
          customer_id?: string
          date?: string
          time?: string
          address?: string
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

