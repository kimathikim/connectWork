"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Briefcase, MapPin, DollarSign, Clock, Filter, Search, ChevronDown, X, User } from "lucide-react"
import { getCurrentUser, getAvailableJobs, getServices } from "../../lib/supabase"

function FindJobsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [location, setLocation] = useState(searchParams.get("location") || "")
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [minBudget, setMinBudget] = useState<number | undefined>(
    searchParams.get("minBudget") ? Number(searchParams.get("minBudget")) : undefined,
  )
  const [maxBudget, setMaxBudget] = useState<number | undefined>(
    searchParams.get("maxBudget") ? Number(searchParams.get("maxBudget")) : undefined,
  )
  const [urgencyLevels, setUrgencyLevels] = useState<string[]>([])

  useEffect(() => {
    checkAuth()
    loadServices()
  }, [])

  useEffect(() => {
    loadJobs()
  }, [searchQuery, location, selectedServices, minBudget, maxBudget, urgencyLevels])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        navigate("/login", { state: { from: "/worker/find-jobs" } })
        return
      }
    } catch (error) {
      console.error("Error checking auth:", error)
    }
  }

  const loadServices = async () => {
    try {
      const servicesData = await getServices()
      setServices(servicesData || [])
    } catch (error) {
      console.error("Error loading services:", error)
    }
  }

  const loadJobs = async () => {
    try {
      setLoading(true)

      const filters: any = {}

      if (selectedServices.length > 0) {
        filters.serviceIds = selectedServices
      }

      if (location) {
        filters.location = location
      }

      if (minBudget !== undefined) {
        filters.minBudget = minBudget
      }

      if (maxBudget !== undefined) {
        filters.maxBudget = maxBudget
      }

      if (urgencyLevels.length > 0) {
        filters.urgency = urgencyLevels
      }

      const jobsData = await getAvailableJobs(filters)

      // Filter by search query if provided
      let filteredJobs = jobsData
      if (searchQuery) {
        filteredJobs = jobsData.filter(
          (job: any) =>
            job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.description.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      }

      setJobs(filteredJobs || [])
    } catch (error) {
      console.error("Error loading jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    // Update URL params
    const params = new URLSearchParams()
    if (searchQuery) params.set("q", searchQuery)
    if (location) params.set("location", location)
    if (minBudget !== undefined) params.set("minBudget", minBudget.toString())
    if (maxBudget !== undefined) params.set("maxBudget", maxBudget.toString())

    setSearchParams(params)
    loadJobs()
  }

  const toggleServiceFilter = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const toggleUrgencyFilter = (urgency: string) => {
    setUrgencyLevels((prev) => (prev.includes(urgency) ? prev.filter((u) => u !== urgency) : [...prev, urgency]))
  }

  const clearFilters = () => {
    setSelectedServices([])
    setMinBudget(undefined)
    setMaxBudget(undefined)
    setUrgencyLevels([])
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Map urgency level to a more user-friendly display
  const getUrgencyDisplay = (urgency: string) => {
    const urgencyMap: Record<string, { label: string; color: string }> = {
      low: { label: "Low Priority", color: "bg-blue-100 text-blue-800" },
      normal: { label: "Normal Priority", color: "bg-green-100 text-green-800" },
      high: { label: "High Priority", color: "bg-orange-100 text-orange-800" },
      emergency: { label: "Emergency", color: "bg-red-100 text-red-800" },
    }

    return urgencyMap[urgency] || { label: "Normal Priority", color: "bg-green-100 text-green-800" }
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Jobs</h1>
          <p className="text-gray-600 mt-2">Browse available jobs that match your skills</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-6">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search jobs by title or description"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                  />
                </div>
              </div>

              <div className="flex-1">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="bg-[#CC7357] text-white px-6 py-3 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Search
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </form>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Advanced Filters</h2>
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[#CC7357] hover:underline flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Service Type */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Service Type</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {services.map((service) => (
                        <label key={service.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service.id)}
                            onChange={() => toggleServiceFilter(service.id)}
                            className="rounded border-gray-300 text-[#CC7357] focus:ring-[#CC7357]"
                          />
                          <span className="ml-2 text-gray-700">{service.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Budget Range</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="minBudget" className="sr-only">
                          Minimum Budget
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            id="minBudget"
                            type="number"
                            placeholder="Min"
                            min="0"
                            value={minBudget === undefined ? "" : minBudget}
                            onChange={(e) => setMinBudget(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="maxBudget" className="sr-only">
                          Maximum Budget
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            id="maxBudget"
                            type="number"
                            placeholder="Max"
                            min="0"
                            value={maxBudget === undefined ? "" : maxBudget}
                            onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Urgency Level */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Urgency Level</h3>
                    <div className="space-y-2">
                      {["low", "normal", "high", "emergency"].map((urgency) => (
                        <label key={urgency} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={urgencyLevels.includes(urgency)}
                            onChange={() => toggleUrgencyFilter(urgency)}
                            className="rounded border-gray-300 text-[#CC7357] focus:ring-[#CC7357]"
                          />
                          <span className="ml-2 text-gray-700">
                            {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Available Jobs</h2>
              <span className="text-gray-500">{jobs.length} jobs found</span>
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-500 mb-6">
                Try adjusting your search filters or check back later for new opportunities.
              </p>
              <button
                onClick={clearFilters}
                className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {jobs.map((job) => {
                const urgencyDisplay = getUrgencyDisplay(job.urgency_level)

                return (
                  <div key={job.id} className="p-6 hover:bg-gray-50">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <Link to={`/jobs/${job.id}`} className="block">
                          <h3 className="text-lg font-bold text-gray-900 hover:text-[#CC7357]">{job.title}</h3>
                        </Link>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                          <div className="flex items-center text-gray-500 text-sm">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{job.location}</span>
                          </div>

                          <div className="flex items-center text-gray-500 text-sm">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span>
                              {job.budget_min === job.budget_max
                                ? `$${job.budget_min}`
                                : `$${job.budget_min} - $${job.budget_max}`}
                            </span>
                          </div>

                          <div className="flex items-center text-gray-500 text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{formatDate(job.created_at)}</span>
                          </div>

                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${urgencyDisplay.color}`}>
                            {urgencyDisplay.label}
                          </span>
                        </div>

                        <p className="text-gray-600 mt-3 line-clamp-2">{job.description}</p>

                        <div className="mt-4 flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                            {job.customer.avatar_url ? (
                              <img
                                src={job.customer.avatar_url || "/placeholder.svg"}
                                alt={job.customer.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-full w-full p-1 text-gray-400" />
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{job.customer.full_name}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors text-center"
                        >
                          View Details
                        </Link>

                        <span className="text-xs text-gray-500 text-center">
                          {job.applications.length} application{job.applications.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FindJobsPage

