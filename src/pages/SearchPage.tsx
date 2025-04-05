"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Search as SearchIcon, MapPin, Filter, Star, ChevronDown, X, DollarSign, Clock } from "lucide-react"
import { supabase, searchWorkers, getServices } from "../lib/supabase"
import { SearchButton } from "../components/SearchButton"
import { useToast } from "../components/ui/toast"
import { useCachedData } from "../hooks/useCachedData"
import { CACHE_KEYS } from "../lib/cache-utils"

function SearchPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workers, setWorkers] = useState<any[]>([])
  const [filteredWorkers, setFilteredWorkers] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const { addToast } = useToast()

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [location, setLocation] = useState("")
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [minRate, setMinRate] = useState<number | undefined>(undefined)
  const [maxRate, setMaxRate] = useState<number | undefined>(undefined)
  const [minRating, setMinRating] = useState<number | undefined>(undefined)
  const [sortBy, setSortBy] = useState<"hourly_rate" | "years_experience" | "avg_rating">("avg_rating")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Use cached data for services
  const {
    data: servicesData,
    loading: servicesLoading,
    error: servicesError
  } = useCachedData(
    CACHE_KEYS.SERVICES,
    getServices,
    { expiry: 24 * 60 * 60 * 1000 } // Cache for 24 hours
  );

  // Use cached data for workers
  const {
    data: workersData,
    loading: workersLoading,
    error: workersError,
    refetch: refetchWorkers
  } = useCachedData(
    `${CACHE_KEYS.WORKER_PROFILES}_all`,
    async () => {
      const { data, error } = await supabase
        .from("worker_profiles")
        .select(`
          *,
          profile:profiles!worker_profiles_id_fkey(*),
          services:worker_services(
            *,
            service:services(*)
          )
        `)
        .order("avg_rating", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    { expiry: 30 * 60 * 1000 } // Cache for 30 minutes
  );

  // Update state when cached data is loaded
  useEffect(() => {
    if (servicesData) {
      setServices(servicesData);
    }
    if (servicesError) {
      console.error("Error loading services:", servicesError);
      setError("Failed to load services. Please try again later.");
      addToast("Failed to load services", "error");
    }
  }, [servicesData, servicesError, addToast]);

  // Update workers data when it changes
  useEffect(() => {
    if (workersData) {
      setWorkers(workersData);
      setLoading(false);

      // Only show toast on initial load, not on every filter change
      if (workersData.length > 0 && !workers.length) {
        addToast(`Loaded ${workersData.length} workers successfully`, "success");
      }
    }
    if (workersError) {
      console.error("Error loading workers:", workersError);
      setError(workersError.message || "Failed to load workers. Please try again later.");
      addToast("Failed to load workers", "error");
      setWorkers([]);
      setLoading(false);
    }
  }, [workersData, workersError, addToast, workers.length]);

  // Filter workers when filter criteria change
  useEffect(() => {
    if (workers.length > 0) {
      const filtered = getFilteredWorkers();
      setFilteredWorkers(filtered);
    }
  }, [searchQuery, location, selectedServices, minRate, maxRate, minRating, sortBy, sortOrder, workers])

  const getFilteredWorkers = () => {
    let filtered = [...workers]

    // Filter by search query (name or profession)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (worker) =>
          (worker.profile?.full_name?.toLowerCase().includes(query) || false) ||
          (worker.profession?.toLowerCase().includes(query) || false)
      )
    }

    // Filter by location
    if (location) {
      const locationQuery = location.toLowerCase()
      filtered = filtered.filter(
        (worker) => worker.profile?.location && worker.profile.location.toLowerCase().includes(locationQuery)
      )
    }

    // Filter by services
    if (selectedServices.length > 0) {
      filtered = filtered.filter((worker) =>
        worker.services && worker.services.some((s: any) => selectedServices.includes(s.service.id))
      )
    }

    // Filter by hourly rate
    if (minRate !== undefined) {
      filtered = filtered.filter((worker) => worker.hourly_rate >= minRate)
    }

    if (maxRate !== undefined) {
      filtered = filtered.filter((worker) => worker.hourly_rate <= maxRate)
    }

    // Filter by rating - check if avg_rating exists before filtering
    if (minRating !== undefined) {
      filtered = filtered.filter((worker) =>
        worker.avg_rating !== undefined ? worker.avg_rating >= minRating : true
      )
    }

    // Sort results - handle missing columns
    filtered.sort((a, b) => {
      // If the sort column doesn't exist, default to hourly_rate
      const aValue = a[sortBy] !== undefined ? a[sortBy] : a.hourly_rate || 0;
      const bValue = b[sortBy] !== undefined ? b[sortBy] : b.hourly_rate || 0;

      if (sortOrder === "asc") {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })

    return filtered;
  }

  // Keep the filterWorkers function for backward compatibility
  const filterWorkers = () => {
    const filtered = getFilteredWorkers();
    setFilteredWorkers(filtered);
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSearching(true)

    // Add a small delay to show the searching state
    setTimeout(() => {
      filterWorkers()
      setIsSearching(false)
    }, 300)
  }

  const toggleServiceFilter = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  const clearFilters = () => {
    setSearchQuery("")
    setLocation("")
    setSelectedServices([])
    setMinRate(undefined)
    setMaxRate(undefined)
    setMinRating(undefined)
    setSortBy("avg_rating")
    setSortOrder("desc")
  }

  const getWorkerServices = (worker: any) => {
    return worker.services && worker.services.length > 0
      ? worker.services.map((s: any) => s.service.name).join(", ")
      : "No services listed"
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find Workers</h1>
          <p className="text-gray-600 mt-2">Search for skilled professionals in your area</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-6">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name or profession"
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

              <SearchButton
                onClick={handleSearch}
                className="bg-[#CC7357] text-white px-6 py-3 rounded-md hover:bg-[#B66347] transition-colors"
                label={isSearching ? "Searching..." : "Search"}
                disabled={isSearching}
              />

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

                  {/* Hourly Rate Range */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Hourly Rate Range (KES)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="minRate" className="sr-only">
                          Minimum Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs font-bold">KES</span>
                          <input
                            id="minRate"
                            type="number"
                            placeholder="Min"
                            min="0"
                            value={minRate === undefined ? "" : minRate}
                            onChange={(e) => setMinRate(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="maxRate" className="sr-only">
                          Maximum Rate
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs font-bold">KES</span>
                          <input
                            id="maxRate"
                            type="number"
                            placeholder="Max"
                            min="0"
                            value={maxRate === undefined ? "" : maxRate}
                            onChange={(e) => setMaxRate(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rating & Sort */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Minimum Rating</h3>
                      <select
                        value={minRating === undefined ? "" : minRating}
                        onChange={(e) => setMinRating(e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                      >
                        <option value="">Any Rating</option>
                        <option value="4">4+ Stars</option>
                        <option value="3">3+ Stars</option>
                        <option value="2">2+ Stars</option>
                      </select>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Sort By</h3>
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [newSortBy, newSortOrder] = e.target.value.split("-") as [
                            "avg_rating" | "hourly_rate" | "years_experience",
                            "asc" | "desc",
                          ]
                          setSortBy(newSortBy)
                          setSortOrder(newSortOrder)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                      >
                        <option value="avg_rating-desc">Highest Rated</option>
                        <option value="avg_rating-asc">Lowest Rated</option>
                        <option value="hourly_rate-asc">Lowest Hourly Rate</option>
                        <option value="hourly_rate-desc">Highest Hourly Rate</option>
                        <option value="years_experience-desc">Most Experienced</option>
                        <option value="years_experience-asc">Least Experienced</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Workers</h2>
              <span className="text-gray-500">{filteredWorkers.length} results</span>
            </div>
          </div>

          {error ? (
            <div className="p-12 text-center">
              <div className="bg-red-50 p-4 rounded-md mb-6 inline-block">
                <p className="text-red-600">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError(null)
                  refetchWorkers()
                }}
                className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
              <span className="ml-3 text-gray-600">Loading workers...</span>
            </div>
          ) : isSearching ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
              <span className="ml-3 text-gray-600">Searching...</span>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-12 text-center">
              <SearchIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workers found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search filters or try a different search term.</p>
              <button
                onClick={clearFilters}
                className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredWorkers.map((worker) => (
                <div key={worker.id} className="p-6 hover:bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mx-auto md:mx-0">
                      {worker.profile?.avatar_url ? (
                        <img
                          src={worker.profile.avatar_url || "/placeholder.svg"}
                          alt={worker.profile.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-4xl font-medium">
                          {worker.profile?.full_name?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-bold text-gray-900">{worker.profile?.full_name || "Unnamed Worker"}</h3>
                      <p className="text-[#6B8E23] font-medium">{worker.profession || "Professional"}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 justify-center md:justify-start">
                        <div className="flex items-center">
                          <Star className="h-5 w-5 text-yellow-400 fill-current" />
                          <span className="ml-1 text-gray-700">
                            {worker.avg_rating ? worker.avg_rating.toFixed(1) : "New"}
                            {worker.total_jobs > 0 && ` (${worker.total_jobs} jobs)`}
                          </span>
                        </div>

                        {worker.profile?.location && (
                          <div className="flex items-center text-gray-500">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{worker.profile.location}</span>
                          </div>
                        )}

                        <div className="flex items-center text-gray-500">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>KES {worker.hourly_rate || 0}/hr</span>
                        </div>

                        {worker.years_experience !== undefined && (
                          <div className="flex items-center text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>{worker.years_experience} years exp.</span>
                          </div>
                        )}
                      </div>

                      {worker.services && worker.services.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-500">
                            <span className="font-medium">Services:</span> {getWorkerServices(worker)}
                          </p>
                        </div>
                      )}

                      {worker.profile?.bio && <p className="mt-3 text-gray-700 line-clamp-2">{worker.profile.bio}</p>}

                      <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                        <Link
                          to={`/workers/${worker.id}`}
                          className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors"
                        >
                          View Profile
                        </Link>

                        <Link
                          to={`/booking?worker=${worker.id}`}
                          className="border border-[#CC7357] text-[#CC7357] px-4 py-2 rounded-md hover:bg-[#FFF8F6] transition-colors"
                        >
                          Book Now
                        </Link>

                        <Link
                          to={`/messages?user=${worker.id}`}
                          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Contact
                        </Link>
                      </div>
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

export default SearchPage
