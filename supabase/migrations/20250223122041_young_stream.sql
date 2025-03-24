/*
  # Initial Schema for ProFinder Platform

  1. New Tables
    - `profiles`
      - Stores user profile information for both workers and customers
      - Links to Supabase auth.users
      - Includes user type, contact info, and profile status
    
    - `worker_profiles`
      - Extended profile information for workers
      - Includes professional details, hourly rate, experience
      - Links to base profile
    
    - `services`
      - Available service categories/professions
      - Used for categorizing workers and jobs
    
    - `worker_services`
      - Junction table linking workers to their services
      - Includes certification info for each service
    
    - `jobs`
      - Job postings from customers
      - Includes job details, budget, status
    
    - `job_applications`
      - Workers' applications to jobs
      - Includes proposal and status
    
    - `reviews`
      - Customer reviews for completed jobs
      - Includes rating and feedback

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users
    - Separate policies for workers and customers
*/

-- Create enum types for status values
CREATE TYPE user_type AS ENUM ('worker', 'customer');
CREATE TYPE job_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  user_type user_type NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  location text,
  address text, -- Added address field
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Worker Profiles (extended details for workers)
CREATE TABLE worker_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id),
  headline text NOT NULL,
  about text,
  hourly_rate integer NOT NULL,
  years_experience integer NOT NULL DEFAULT 0,
  availability boolean DEFAULT true,
  total_jobs integer DEFAULT 0,
  avg_rating decimal(3,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT hourly_rate_positive CHECK (hourly_rate > 0),
  CONSTRAINT years_experience_positive CHECK (years_experience >= 0)
);

-- Services/Professions
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Worker Services (junction table with certifications)
CREATE TABLE worker_services (
  worker_id uuid REFERENCES worker_profiles(id),
  service_id uuid REFERENCES services(id),
  certifications text[],
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (worker_id, service_id)
);

-- Jobs
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id),
  service_id uuid REFERENCES services(id),
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  budget_min integer,
  budget_max integer,
  status job_status DEFAULT 'open',
  urgency_level text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT budget_range CHECK (budget_max >= budget_min)
);

-- Job Applications
CREATE TABLE job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id),
  worker_id uuid REFERENCES worker_profiles(id),
  proposal text NOT NULL,
  price integer NOT NULL,
  status application_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_id, worker_id)
);

-- Reviews
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) UNIQUE,
  reviewer_id uuid REFERENCES profiles(id),
  worker_id uuid REFERENCES worker_profiles(id),
  rating integer NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policies

-- Profiles: users can read all profiles but only update their own
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Worker Profiles: viewable by all, updatable by owner
CREATE POLICY "Worker profiles are viewable by everyone"
  ON worker_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers can update own profile"
  ON worker_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Services: viewable by all, managed by admin (default RLS will prevent non-admin modifications)
CREATE POLICY "Services are viewable by everyone"
  ON services FOR SELECT
  TO authenticated
  USING (true);

-- Worker Services: viewable by all, managed by worker
CREATE POLICY "Worker services are viewable by everyone"
  ON worker_services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Workers can manage their services"
  ON worker_services FOR ALL
  TO authenticated
  USING (auth.uid() = worker_id);

-- Jobs: viewable by all, managed by job owner
CREATE POLICY "Jobs are viewable by everyone"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Customers can manage their jobs"
  ON jobs FOR ALL
  TO authenticated
  USING (auth.uid() = customer_id);

-- Job Applications: viewable by job owner and applicant, managed by worker
CREATE POLICY "Workers can view their applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    auth.uid() = worker_id OR 
    auth.uid() IN (
      SELECT customer_id FROM jobs WHERE id = job_id
    )
  );

CREATE POLICY "Workers can create and update their applications"
  ON job_applications FOR ALL
  TO authenticated
  USING (auth.uid() = worker_id);

-- Reviews: viewable by all, created by job owner
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Customers can create reviews for their jobs"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT customer_id FROM jobs WHERE id = job_id
    )
  );

-- Insert some initial services
INSERT INTO services (name, description) VALUES
  ('Plumbing', 'Plumbing installation, repair, and maintenance services'),
  ('Electrical', 'Electrical installation, repair, and maintenance services'),
  ('Carpentry', 'Woodworking, furniture repair, and general carpentry services'),
  ('Painting', 'Interior and exterior painting services'),
  ('HVAC', 'Heating, ventilation, and air conditioning services');
