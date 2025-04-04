// Skill matching algorithms for worker and job matching

/**
 * Calculate skill match score between worker skills and job requirements
 * @param workerSkills Array of worker skills
 * @param jobSkills Array of job required skills
 * @returns Match score between 0 and 1
 */
export function calculateSkillMatchScore(
  workerSkills: string[],
  jobSkills: string[]
): number {
  if (!jobSkills.length) return 1; // If job has no required skills, worker is a perfect match
  if (!workerSkills.length) return 0; // If worker has no skills, they're not a match

  // Normalize skills (lowercase, trim)
  const normalizedWorkerSkills = workerSkills.map(skill => 
    skill.toLowerCase().trim()
  );
  
  const normalizedJobSkills = jobSkills.map(skill => 
    skill.toLowerCase().trim()
  );

  // Count matching skills
  const matchingSkills = normalizedJobSkills.filter(jobSkill => 
    normalizedWorkerSkills.some(workerSkill => 
      workerSkill === jobSkill || workerSkill.includes(jobSkill) || jobSkill.includes(workerSkill)
    )
  );

  // Calculate match score (0 to 1)
  return matchingSkills.length / normalizedJobSkills.length;
}

/**
 * Calculate skill relevance score for a worker based on their skills and experience
 * @param worker Worker profile with skills and experience
 * @param jobSkills Array of job required skills
 * @returns Relevance score object with total score and breakdown
 */
export function calculateRelevanceScore(
  worker: any,
  jobSkills: string[]
): { 
  totalScore: number; 
  skillMatchScore: number;
  experienceScore: number;
  ratingScore: number;
} {
  // Get worker skills
  const workerSkills = worker.skills || [];
  
  // Calculate skill match score (50% weight)
  const skillMatchScore = calculateSkillMatchScore(workerSkills, jobSkills);
  
  // Calculate experience score (30% weight)
  // Normalize experience score (0-10 years = 0-1 score)
  const yearsExperience = worker.years_experience || 0;
  const experienceScore = Math.min(yearsExperience / 10, 1);
  
  // Calculate rating score (20% weight)
  // Normalize rating score (1-5 stars = 0-1 score)
  const rating = worker.avg_rating || 0;
  const ratingScore = (rating - 1) / 4; // Convert 1-5 to 0-1
  
  // Calculate total relevance score
  const totalScore = 
    (skillMatchScore * 0.5) + 
    (experienceScore * 0.3) + 
    (ratingScore * 0.2);
  
  return {
    totalScore,
    skillMatchScore,
    experienceScore,
    ratingScore
  };
}

/**
 * Find the best matching workers for a job based on skills and other factors
 * @param workers Array of worker profiles
 * @param jobSkills Array of job required skills
 * @param minMatchScore Minimum match score (0-1)
 * @returns Sorted array of workers with match scores
 */
export function findMatchingWorkers(
  workers: any[],
  jobSkills: string[],
  minMatchScore: number = 0.3
): any[] {
  return workers
    .map(worker => {
      const relevanceScores = calculateRelevanceScore(worker, jobSkills);
      return {
        ...worker,
        relevanceScores
      };
    })
    .filter(worker => worker.relevanceScores.totalScore >= minMatchScore)
    .sort((a, b) => b.relevanceScores.totalScore - a.relevanceScores.totalScore);
}

/**
 * Find the best matching jobs for a worker based on skills
 * @param jobs Array of job listings
 * @param workerSkills Array of worker skills
 * @param minMatchScore Minimum match score (0-1)
 * @returns Sorted array of jobs with match scores
 */
export function findMatchingJobs(
  jobs: any[],
  workerSkills: string[],
  minMatchScore: number = 0.3
): any[] {
  return jobs
    .map(job => {
      const jobSkills = job.required_skills || [];
      const skillMatchScore = calculateSkillMatchScore(workerSkills, jobSkills);
      
      return {
        ...job,
        skillMatchScore
      };
    })
    .filter(job => job.skillMatchScore >= minMatchScore)
    .sort((a, b) => b.skillMatchScore - a.skillMatchScore);
}
