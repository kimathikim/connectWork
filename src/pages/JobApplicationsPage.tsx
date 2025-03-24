"use client"


import React from "react"

import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  Briefcase,
  Star,
  DollarSign,
  Clock,
  CheckCircle,
  X,
  MessageSquare,
  ChevronLeft,
  AlertCircle,
  MapPin,
} from "lucide-react"
import { supabase } from "../lib/supabase"

function JobApplicationsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  useEffect(() => {
    loadJobAndApplications()
  }, [jobId])

  const loadJobAndApplications = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!jobId) {
        setError("Job ID is missing")
        return
      }

      // Check if user is authorized to view this job
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login", { state: { from: `/job-applications/${jobId}` } })
        return
      }

      // Get job details
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select(`
          *,
          service:services(*),
          customer:profiles!customer_id(*)
        `)
        .eq("id", jobId)
        .single()

      if (jobError) throw jobError

      // Check if user is the job owner
      if (jobData.customer_id !== user.id) {
        setError("You are not authorized to view these applications")
        return
      }

      setJob(jobData)

      // Get applications for this job
      const { data: applicationsData, error: applicationsError } = await supabase
        .from("job_applications")
        .select(`
          *,
          worker:worker_profiles(
            *,
            profile:profiles!worker_profiles_id_fkey(*),
            services:worker_services(
              *,
              service:services(*)
            )
          )
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })

      if (applicationsError) throw applicationsError

      setApplications(applicationsData || [])
    } catch (err) {
      console.error("Error loading job applications:", err)
      setError("Failed to load applications. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const handleAcceptApplication = async (applicationId: string) => {
    try {
      setProcessingAction(applicationId)
      setError(null)

      // Get the application to find the worker
      const { data: application, error: applicationError } = await supabase
        .from("job_applications")
        .select("worker_id")
        .eq("id", applicationId)
        .single()

      if (applicationError) {
        setError("Failed to get application details: " + applicationError.message)
        return
      }

      // Start a transaction by using multiple operations
      // Update the application status to accepted
      const { error: updateError } = await supabase
        .from("job_applications")
        .update({ status: "accepted" })
        .eq("id", applicationId)

      if (updateError) {
        setError("Failed to accept application: " + updateError.message)
        return
      }

      // Update the job status to in_progress and assign the worker
      const { error: jobUpdateError } = await supabase
        .from("jobs")
        .update({ 
          status: "in_progress",
          assigned_worker_id: application.worker_id 
        })
        .eq("id", jobId)

      if (jobUpdateError) {
        setError("Failed to update job status: " + jobUpdateError.message)
        // Try to revert the previous change
        await supabase.from("job_applications").update({ status: "pending" }).eq("id", applicationId)
        return
      }

      // Reject all other applications
      const { error: rejectError } = await supabase
        .from("job_applications")
        .update({ status: "rejected" })
        .eq("job_id", jobId)
        .neq("id", applicationId)

      if (rejectError) {
        console.error("Error rejecting other applications:", rejectError)
        // Continue anyway as this is not critical
      }

      // Reload the job and applications
      await loadJobAndApplications()
      
      // Show success message
      alert("Application accepted successfully! The job has been assigned to the worker.")
    } catch (err) {
      console.error("Error accepting application:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setProcessingAction(null)
    }
  }

  const handleRejectApplication = async (applicationId: string) => {
    try {
      setProcessingAction(applicationId)
      setError(null)

      // Update the application status to rejected
      const { error: updateError } = await supabase
        .from("job_applications")
        .update({ status: "rejected" })
        .eq("id", applicationId)

      if (updateError) {
        setError("Failed to reject application: " + updateError.message)
        return
      }

      // Reload the job and applications
      await loadJobAndApplications()
      
      // Show success message
      alert("Application rejected successfully.")
    } catch (err) {
      console.error("Error rejecting application:", err)
      setError("Failed to reject application. Please try again.")
    } finally {
      setProcessingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || "This job could not be found or has been removed."}</p>
          <Link
            to="/dashboard"
            className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const hasAcceptedApplication = applications.some((app) => app.status === "accepted")

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Applications for "{job.title}"</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
              <div className="flex items-center text-gray-500 text-sm">
                <Clock className="h-4 w-4 mr-1" />
                <span>Posted on {formatDate(job.created_at)}</span>
              </div>

              <div className="flex items-center text-gray-500 text-sm">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>
                  {job.budget_min === job.budget_max ? `$${job.budget_min}` : `$${job.budget_min} - $${job.budget_max}`}
                </span>
              </div>

              {job.service && (
                <div className="flex items-center text-gray-500 text-sm">
                  <Briefcase className="h-4 w-4 mr-1" />
                  <span>{job.service.name}</span>
                </div>
              )}

              <div className="flex items-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    job.status === "open"
                      ? "bg-blue-100 text-blue-800"
                      : job.status === "in_progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                  }`}
                >
                  {job.status === "open" ? "Open" : job.status === "in_progress" ? "In Progress" : "Completed"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Job Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Worker Applications</h2>
              <span className="text-gray-500">{applications.length} applications</span>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-500 mb-6">Your job is still open. Check back later for applications.</p>
              <Link
                to="/dashboard"
                className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {applications.map((application) => (
                <div key={application.id} className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mx-auto md:mx-0">
                      {application.worker.profile.avatar_url ? (
                        <img
                          src={application.worker.profile.avatar_url || "/placeholder.svg"}
                          alt={application.worker.profile.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400 text-4xl font-medium">
                          {application.worker.profile.full_name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{application.worker.profile.full_name}</h3>
                          <p className="text-[#6B8E23] font-medium">{application.worker.profession}</p>
                        </div>

                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              application.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : application.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 justify-center md:justify-start">
                        <div className="flex items-center">
                          <Star className="h-5 w-5 text-yellow-400 fill-current" />
                          <span className="ml-1 text-gray-700">
                            {application.worker.rating ? application.worker.rating.toFixed(1) : "New"}
                            {application.worker.review_count > 0 && ` (${application.worker.review_count} reviews)`}
                          </span>
                        </div>

                        {application.worker.profile.location && (
                          <div className="flex items-center text-gray-500">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{application.worker.profile.location}</span>
                          </div>
                        )}

                        <div className="flex items-center text-gray-500">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>Proposed: ${application.proposed_rate}/hr</span>
                        </div>

                        <div className="flex items-center text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{application.worker.years_experience} years exp.</span>
                        </div>

                        <div className="flex items-center text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Applied {formatDate(application.created_at)}</span>
                        </div>
                      </div>

                      {application.cover_letter && (
                        <div className="mt-4 bg-gray-50 p-4 rounded-md">
                          <h4 className="font-medium text-gray-900 mb-2">Cover Letter:</h4>
                          <p className="text-gray-700">{application.cover_letter}</p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                        <Link
                          to={`/worker-profile/${application.worker.id}`}
                          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          View Profile
                        </Link>

                        <Link
                          to={`/messages?user=${application.worker.id}`}
                          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          <MessageSquare className="h-4 w-4 inline mr-1" />
                          Message
                        </Link>

                        {application.status === "pending" && !hasAcceptedApplication && (
                          <>
                            <button
                              onClick={() => handleAcceptApplication(application.id)}
                              disabled={!!processingAction}
                              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              {processingAction === application.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-1"></div>
                              ) : (
                                <CheckCircle className="h-4 w-4 inline mr-1" />
                              )}
                              Accept Application
                            </button>

                            <button
                              onClick={() => handleRejectApplication(application.id)}
                              disabled={!!processingAction}
                              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {processingAction === application.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-1"></div>
                              ) : (
                                <X className="h-4 w-4 inline mr-1" />
                              )}
                              Reject
                            </button>
                          </>
                        )}
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

export default JobApplicationsPage

