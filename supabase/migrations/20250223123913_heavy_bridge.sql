/*
  # Fix Database Relationships

  This migration fixes the relationships between tables by:
  1. Adding proper foreign key references
  2. Updating column names for consistency
  3. Adding indexes for better query performance
*/

-- Add foreign key reference from worker_profiles to profiles
ALTER TABLE worker_profiles
ADD CONSTRAINT worker_profiles_profile_id_fkey
FOREIGN KEY (id) REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add index on profiles.location for location-based searches
CREATE INDEX idx_profiles_location ON profiles(location);

-- Add index on worker_profiles.hourly_rate for price filtering
CREATE INDEX idx_worker_profiles_hourly_rate ON worker_profiles(hourly_rate);

-- Add index on worker_profiles.avg_rating for rating filtering
CREATE INDEX idx_worker_profiles_avg_rating ON worker_profiles(avg_rating);

-- Add indexes for worker_services relationships
CREATE INDEX idx_worker_services_worker_id ON worker_services(worker_id);
CREATE INDEX idx_worker_services_service_id ON worker_services(service_id);

-- Add index on services.name for service name searches
CREATE INDEX idx_services_name ON services(name);