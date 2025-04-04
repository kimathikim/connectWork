import React, { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Briefcase, MapPin, DollarSign, Clock, User } from "lucide-react"
import { getCurrentUser, getAvailableJobs } from "../../lib/supabase"
import { ensureJobsRequiredSkills } from "../../lib/job-utils.js"
import { useToast } from "../../components/ui/toast"
import AdvancedJobSearch from "../../components/AdvancedJobSearch"

function FindJobsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Advanced search filters
  const [filters, setFilters] = useState({
    query: searchParams.get("q") || "",
    location: searchParams.get("location") || "",
    serviceIds: [] as string[],
    minBudget: searchParams.get("minBudget") ? Number(searchParams.get("minBudget")) : undefined as number | undefined,
    maxBudget: searchParams.get("maxBudget") ? Number(searchParams.get("maxBudget")) : undefined as number | undefined,
    urgency: [] as string[],
    datePosted: "any",
    requiredSkills: [] as string[],
    maxDistance: 50,
    sortBy: "date",
    sortOrder: "desc" as "asc" | "desc"
  })

  useEffect(() => {
    checkAuth()
    loadJobs()
  }, [])

  useEffect(() => {
    // Update URL search params when filters change
    const newSearchParams = new URLSearchParams()

    if (filters.query) newSearchParams.set("q", filters.query)
    if (filters.location) newSearchParams.set("location", filters.location)
    if (filters.minBudget !== undefined) newSearchParams.set("minBudget", filters.minBudget.toString())
    if (filters.maxBudget !== undefined) newSearchParams.set("maxBudget", filters.maxBudget.toString())

    setSearchParams(newSearchParams)
  }, [filters, setSearchParams])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        navigate("/login", { state: { from: "/worker/find-jobs" } })
        return
      }
    } catch (error) {
      console.error("Error checking auth:", error)
      addToast("Authentication error. Please log in again.", "error")
    }
  }

  const loadJobs = async () => {
    try {
      setLoading(true)
      setIsSearching(true)

      // Use the filters state for job search
      const jobsData = await getAvailableJobs(filters)

      // Ensure all jobs have the required_skills field
      const jobsWithSkills = ensureJobsRequiredSkills(jobsData || [])

      setJobs(jobsWithSkills)

      // Show toast notification
      if (jobsData.length === 0) {
        addToast("No jobs found matching your criteria", "info")
      } else {
        addToast(`Found ${jobsData.length} jobs matching your criteria`, "success")
      }
    } catch (error: any) {
      console.error("Error loading jobs:", error)
      addToast(error.message || "Failed to load jobs", "error")
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }

  const handleSearch = (searchFilters: any) => {
    // Update filters state with new search parameters
    setFilters(searchFilters)

    // Load jobs with new filters
    loadJobs()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "low":
        return "bg-blue-100 text-blue-800"
      case "normal":
        return "bg-green-100 text-green-800"
      case "high":
        return "bg-yellow-100 text-yellow-800"
      case "emergency":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Find Jobs</h1>
        </div>

        {/* Advanced Job Search Component */}
        <AdvancedJobSearch
          onSearch={handleSearch}
          initialFilters={filters}
        />

        {/* Jobs List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isSearching ? "Searching..." : `${jobs.length} Jobs Found`}
            </h2>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
              <span className="ml-3 text-gray-600">Loading jobs...</span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search filters or try a different search term.</p>
              <button
                onClick={() => handleSearch({})}
                className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <div key={job.id} className="p-6 hover:bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="flex items-start">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {job.customer?.avatar_url ? (
                            <img
                              src={job.customer.avatar_url}
                              alt={job.customer.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-full w-full p-2 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            <Link to={`/jobs/${job.id}`} className="hover:text-[#CC7357]">
                              {job.title}
                            </Link>
                          </h3>
                          <p className="text-sm text-gray-500">{job.customer?.full_name || "Unknown Customer"}</p>

                          {/* Location */}
                          {job.location && (
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              <span>
                                {job.location}
                                {job.distance !== undefined && (
                                  <span className="ml-1 text-[#CC7357]">
                                    ({job.distance.toFixed(1)} km)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Date Posted */}
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            <span>Posted {formatDate(job.created_at)}</span>
                          </div>

                          {/* Tags */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {/* Service Type */}
                            {job.service && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {job.service.name}
                              </span>
                            )}

                            {/* Urgency */}
                            {job.urgency_level && (
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(
                                  job.urgency_level
                                )}`}
                              >
                                {job.urgency_level.charAt(0).toUpperCase() + job.urgency_level.slice(1)}
                              </span>
                            )}

                            {/* Required Skills */}
                            {job.required_skills && job.required_skills.length > 0 &&
                              job.required_skills.slice(0, 3).map((skill: string, index: number) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5F5DC] text-[#CC7357]"
                                >
                                  {skill}
                                </span>
                              ))
                            }

                            {job.required_skills && job.required_skills.length > 3 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                +{job.required_skills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0 md:ml-6 flex flex-col items-end">
                      <div className="text-lg font-medium text-gray-900">
                        {job.budget_min === job.budget_max
                          ? `KES ${job.budget_min}`
                          : `KES ${job.budget_min} - ${job.budget_max}`}
                      </div>

                      {/* Match score if available */}
                      {job.skillMatchScore !== undefined && (
                        <div className="mt-1 text-sm">
                          <div className="flex items-center">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${job.skillMatchScore * 100}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-gray-500">
                              {Math.round(job.skillMatchScore * 100)}% match
                            </span>
                          </div>
                        </div>
                      )}

                      <Link
                        to={`/jobs/${job.id}`}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#CC7357] hover:bg-[#B66347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC7357]"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FindJobsPage
