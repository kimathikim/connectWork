import { supabase } from './supabase';

/**
 * Ensures that a job has the required_skills field
 * @param {Object} jobData The job data to check
 * @returns {Object} The job data with required_skills field
 */
export const ensureJobRequiredSkills = (jobData) => {
  if (!jobData) return jobData;
  
  // If the job doesn't have required_skills, add an empty array
  if (!jobData.hasOwnProperty('required_skills')) {
    return {
      ...jobData,
      required_skills: []
    };
  }
  
  // If required_skills is null, replace with empty array
  if (jobData.required_skills === null) {
    return {
      ...jobData,
      required_skills: []
    };
  }
  
  return jobData;
};

/**
 * Ensures that all jobs in an array have the required_skills field
 * @param {Array} jobsData Array of job data
 * @returns {Array} Array of job data with required_skills field
 */
export const ensureJobsRequiredSkills = (jobsData) => {
  if (!jobsData || !Array.isArray(jobsData)) return jobsData;
  
  return jobsData.map(job => ensureJobRequiredSkills(job));
};

/**
 * Updates the required_skills field for a job
 * @param {string} jobId The job ID
 * @param {Array} skills Array of required skills
 * @returns {boolean} True if successful
 */
export const updateJobRequiredSkills = async (jobId, skills) => {
  try {
    const { error } = await supabase
      .from('jobs')
      .update({ required_skills: skills })
      .eq('id', jobId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating job required skills:', error);
    return false;
  }
};

/**
 * Finds jobs that match the given skills
 * @param {Array} skills Array of skills to match
 * @param {number} limit Maximum number of results to return
 * @returns {Array} Array of matching jobs
 */
export const findJobsBySkills = async (skills, limit = 10) => {
  try {
    // Get all jobs first (we'll filter in memory since array containment is complex)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    // Ensure all jobs have required_skills field
    const jobsWithSkills = ensureJobsRequiredSkills(data);
    
    // If no skills provided, return all jobs
    if (!skills || skills.length === 0) {
      return jobsWithSkills;
    }
    
    // Filter jobs by skills (case-insensitive)
    const normalizedSkills = skills.map(s => s.toLowerCase().trim());
    
    return jobsWithSkills.filter(job => {
      // If job has no required skills, include it in results
      if (!job.required_skills || job.required_skills.length === 0) {
        return true;
      }
      
      // Check if any of the job's required skills match the filter skills
      const jobSkills = job.required_skills.map(s => s.toLowerCase().trim());
      return normalizedSkills.some(s => jobSkills.includes(s));
    });
  } catch (error) {
    console.error('Error finding jobs by skills:', error);
    return [];
  }
};
