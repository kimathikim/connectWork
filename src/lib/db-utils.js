import { supabase } from './supabase';

/**
 * Checks if a column exists in a table by trying to query it
 * @param {string} tableName The name of the table
 * @param {string} columnName The name of the column
 * @returns {Promise<boolean>} True if the column exists, false otherwise
 */
export async function columnExists(tableName, columnName) {
  try {
    // We can't directly query information_schema through RLS
    // Instead, we'll try to query the table with a limit 0 and see if the column is in the response
    const query = `select ${columnName} from ${tableName} limit 0`;
    const { data, error } = await supabase.rpc('execute_sql', { query });

    if (error) {
      // If there's an error like "column does not exist", the column doesn't exist
      console.error('Error checking if column exists:', error);
      return false;
    }

    // If we got here, the column exists
    return true;
  } catch (error) {
    console.error('Error checking if column exists:', error);
    return false;
  }
}

/**
 * Ensures that the required_skills column exists in the jobs table
 * This function should be called when the application starts
 */
export async function ensureRequiredSkillsColumn() {
  try {
    // Instead of checking if the column exists, we'll just try to use it
    // and handle the case where it doesn't exist in our application code
    console.log('Checking for required_skills column in jobs table...');

    // Try to get a job with the required_skills column
    const { data, error } = await supabase
      .from('jobs')
      .select('id, required_skills')
      .limit(1);

    if (error) {
      // If there's an error, the column might not exist
      console.warn('Error querying required_skills column:', error.message);
      console.warn('The required_skills column might not exist in the jobs table.');
      console.warn('Please run the SQL migration script to add the required_skills column to the jobs table.');
      console.warn('You can find the script at: src/db/migrations/add_required_skills_to_jobs.sql');
    } else {
      console.log('Successfully queried the jobs table with required_skills column.');
    }

    // Return true to indicate that we've checked for the column
    return true;
  } catch (error) {
    console.error('Error ensuring required_skills column:', error);
    return false;
  }
}

/**
 * Updates the job schema to include required_skills
 * This is a workaround for when we can't directly modify the database schema
 * @param {Object} jobData The job data to update
 * @returns {Object} The updated job data
 */
export function ensureJobSchema(jobData) {
  // If the job data doesn't have required_skills, add it as an empty array
  if (!jobData.hasOwnProperty('required_skills')) {
    return {
      ...jobData,
      required_skills: []
    };
  }
  return jobData;
}
