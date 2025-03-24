"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Briefcase, MapPin, DollarSign, Clock, User, ChevronLeft } from "lucide-react"
import { getCurrentUser, getWorkerJobs } from "../../lib/supabase"
import React from "react"

function WorkerJobsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const statusFilter = searchParams.get("status")

  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<any[]>([])
  const [filteredJobs, setFilteredJobs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState(statusFilter || "all")

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    filterJobs(activeTab)
  }, [jobs, activeTab])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        navigate("/login", { state: { from: "/worker/jobs" } })
        return
      }

      await loadJobs(currentUser.id)
    } catch (error) {
      console.error("Error checking auth:", error)
    }
  }

  const loadJobs = async (userId: string) => {
    try {
      setLoading(true)
      const workerJobs = await getWorkerJobs(userId)
      setJobs(workerJobs || [])
    } catch (error) {
      console.error("Error loading jobs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterJobs = (status: string) => {
    if (status === "all") {
      setFilteredJobs(jobs)
    } else if (status === "active") {
      setFilteredJobs(jobs.filter((job) => job.status === "accepted" && job.job.status !== "completed"))
    } else if (status === "pending") {
      setFilteredJobs(jobs.filter((job) => job.status === "pending"))
    } else if (status === "completed") {
      setFilteredJobs(jobs.filter((job) => job.job.status === "completed"))
    } else if (status === "rejected") {
      setFilteredJobs(jobs.filter((job) => job.status === "rejected"))
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)

    // Update URL
    const params = new URLSearchParams(searchParams)
    if (tab === "all") {
      params.delete("status")
    } else {
      params.set("status", tab)
    }
    navigate(`/worker/jobs?${params.toString()}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to="/worker/dashboard" className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
          <p className="text-gray-600 mt-2">Manage your job applications and active projects</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => handleTabChange("all")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === "all"
                    ? "border-[#CC7357] text-[#CC7357]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                All Jobs
              </button>
              <button
                onClick={() => handleTabChange("active")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === "active"
                    ? "border-[#CC7357] text-[#CC7357]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => handleTabChange("pending")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === "pending"
                    ? "border-[#CC7357] text-[#CC7357]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => handleTabChange("completed")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === "completed"
                    ? "border-[#CC7357] text-[#CC7357]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => handleTabChange("rejected")}
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  activeTab === "rejected"
                    ? "border-[#CC7357] text-[#CC7357]"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Rejected
              </button>
            </nav>
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-500 mb-6">
                {activeTab === "all"
                  ? "You haven't applied to any jobs yet."
                  : activeTab === "active"
                    ? "You don't have any active jobs."
                    : activeTab === "pending"
                      ? "You don't have any pending applications."
                      : activeTab === "completed"
                        ? "You don't have any completed jobs."
                        : "You don't have any rejected applications."}
              </p>
              <Link
                to="/worker/find-jobs"
                className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Find Jobs
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredJobs.map((application) => (
                <div key={application.id} className="p-6 hover:bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <Link to={`/jobs/${application.job_id}`} className="block">
                        <h3 className="text-lg font-bold text-gray-900 hover:text-[#CC7357]">
                          {application.job.title}
                        </h3>
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                        <div className="flex items-center text-gray-500 text-sm">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{application.job.location}</span>
                        </div>

                        <div className="flex items-center text-gray-500 text-sm">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>
                            {application.job.budget_min === application.job.budget_max
                              ? `$${application.job.budget_min}`
                              : `$${application.job.budget_min} - $${application.job.budget_max}`}
                          </span>
                        </div>

                        <div className="flex items-center text-gray-500 text-sm">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Applied on {formatDate(application.created_at)}</span>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            application.status === "accepted"
                              ? "bg-green-100 text-green-800"
                              : application.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : application.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </span>

                        {application.job.status === "completed" && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Completed
                          </span>
                        )}
                      </div>

                      {application.proposal && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            <span className="font-medium">Your proposal: </span>
                            {application.proposal}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex items-center">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                          {application.job.customer.avatar_url ? (
                            <img
                              src={application.job.customer.avatar_url || "/placeholder.svg"}
                              alt={application.job.customer.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-full w-full p-1 text-gray-400" />
                          )}
                        </div>
                        <span className="text-sm text-gray-600">{application.job.customer.full_name}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        to={`/jobs/${application.job_id}`}
                        className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors text-center"
                      >
                        View Details
                      </Link>

                      {application.status === "accepted" && application.job.status !== "completed" && (
                        <Link
                          to={`/messages?job=${application.job_id}&user=${application.job.customer.id}`}
                          className="border border-[#CC7357] text-[#CC7357] px-6 py-2 rounded-md hover:bg-[#CC7357] hover:text-white transition-colors text-center"
                        >
                          Message Client
                        </Link>
                      )}
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

export default WorkerJobsPage

