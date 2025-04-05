-- Create a function to update application status with elevated privileges
CREATE OR REPLACE FUNCTION update_application_status(app_id UUID, new_status TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- This will run with the privileges of the function creator
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE job_applications
  SET 
    status = new_status,
    updated_at = NOW()
  WHERE id = app_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Return true if at least one row was updated
  RETURN updated_count > 0;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_application_status TO authenticated;

-- Add comment to explain the function
COMMENT ON FUNCTION update_application_status IS 'Updates the status of a job application with elevated privileges';
