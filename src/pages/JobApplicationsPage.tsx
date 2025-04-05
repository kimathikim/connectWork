"use client"


import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  Briefcase,
  Star,
  Clock,
  CheckCircle,
  X,
  MessageSquare,
  ChevronLeft,
  AlertCircle,
  MapPin,
} from "lucide-react"
import { supabase, acceptJobApplication, testConnection } from "../lib/supabase"

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

      if (!jobId) {
        setError("Job ID is missing")
        return
      }

      if (!applicationId) {
        setError("Application ID is missing")
        return
      }

      // Test database connection first
      try {
        await testConnection();
      } catch (connError: any) {
        console.error('Database connection error:', connError);
        setError(`Database connection error: ${connError.message || 'Could not connect to database'}`);
        return;
      }

      console.log(`Accepting application ${applicationId} for job ${jobId}`);

      // Use the centralized function to accept the job application
      const result = await acceptJobApplication(applicationId, jobId)

      console.log('Accept application result:', result);

      // Reload the job and applications
      await loadJobAndApplications()

      // Verify the application status was updated
      const verifyApplication = applications.find(app => app.id === applicationId);
      if (verifyApplication && verifyApplication.status !== 'accepted') {
        console.warn('Application status may not have been updated correctly:', verifyApplication);

        // Check directly in the database
        const { data: dbApplication, error: dbError } = await supabase
          .from('job_applications')
          .select('status')
          .eq('id', applicationId)
          .single();

        if (dbError) {
          console.error('Error verifying application status in database:', dbError);
        } else if (dbApplication && dbApplication.status !== 'accepted') {
          console.error('Application status is not accepted in the database:', dbApplication);

          // Try to update it directly
          const { error: updateError } = await supabase
            .from('job_applications')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', applicationId);

          if (updateError) {
            console.error('Error updating application status directly:', updateError);
          } else {
            console.log('Successfully updated application status directly');
          }
        } else {
          console.log('Application status is accepted in the database, but not in local state');
        }

        // Try to refresh the data one more time
        await loadJobAndApplications();

        // Check again after refresh
        const refreshedApplication = applications.find(app => app.id === applicationId);
        if (refreshedApplication && refreshedApplication.status !== 'accepted') {
          console.error('Application status still not updated after refresh');
          setError('The application was accepted, but there was an issue updating its status. Please refresh the page.');
          return;
        }
      }

      // Show success message
      alert("Application accepted successfully! The job has been assigned to the worker.")
    } catch (err: any) {
      console.error("Error accepting application:", err)

      // Provide a more user-friendly error message
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (err.message) {
        if (err.message.includes("Application not found")) {
          errorMessage = "This application no longer exists. It may have been deleted or already processed.";
        } else if (err.message.includes("Job not found")) {
          errorMessage = "This job no longer exists. It may have been deleted.";
        } else if (err.message.includes("Failed to assign worker")) {
          errorMessage = "Could not assign the worker to this job. The job may already be assigned.";
        } else if (err.message.includes("Application exists but could not be updated") ||
                   err.message.includes("Failed to update application status")) {
          errorMessage = "Could not update the application status. Trying alternative method...";

          // Try a direct update as a fallback
          try {
            console.log('Attempting direct update as fallback...');

            // First, check if the application exists and get its worker_id
            const { data: application, error: appError } = await supabase
              .from("job_applications")
              .select("worker_id, status")
              .eq("id", applicationId)
              .single();

            if (appError) {
              console.error('Error fetching application:', appError);
              throw new Error(`Failed to get application details: ${appError.message}`);
            }

            if (!application) {
              console.error('Application not found with ID:', applicationId);
              throw new Error('Application not found with the provided ID');
            }

            console.log('Current application state:', application);

            // Check if the application is already accepted
            if (application.status === 'accepted') {
              console.log('Application is already accepted, just updating the job');
            } else {
              // Try multiple approaches to update the application

              // Approach 1: Direct update
              console.log('Approach 1: Direct update');
              const { error: directUpdateError } = await supabase
                .from("job_applications")
                .update({
                  status: "accepted",
                  updated_at: new Date().toISOString()
                })
                .eq("id", applicationId);

              if (directUpdateError) {
                console.error('Direct update failed:', directUpdateError);

                // Approach 2: RPC function
                console.log('Approach 2: Using RPC function');
                const { error: rpcError } = await supabase.rpc('update_application_status', {
                  app_id: applicationId,
                  new_status: 'accepted'
                });

                if (rpcError) {
                  console.error('RPC update failed:', rpcError);
                  throw new Error(`Failed to update application status: ${rpcError.message}`);
                }
              }

              // Verify the update was successful
              const { data: verifyApp } = await supabase
                .from("job_applications")
                .select("status")
                .eq("id", applicationId)
                .single();

              console.log('Verification result:', verifyApp);

              if (!verifyApp || verifyApp.status !== 'accepted') {
                console.error('Application status still not updated after all attempts');
                throw new Error('Failed to update application status after multiple attempts');
              }
            }

            // Now update the job with the worker ID
            if (application.worker_id) {
              const { error: jobUpdateError } = await supabase
                .from("jobs")
                .update({
                  assigned_worker_id: application.worker_id,
                  status: "in_progress",
                  updated_at: new Date().toISOString()
                })
                .eq("id", jobId);

              if (jobUpdateError) {
                console.error('Error updating job:', jobUpdateError);
                throw new Error(`Failed to update job: ${jobUpdateError.message}`);
              }

              // Reject other applications
              const { error: rejectError } = await supabase
                .from("job_applications")
                .update({
                  status: "rejected",
                  updated_at: new Date().toISOString()
                })
                .eq("job_id", jobId)
                .neq("id", applicationId);

              if (rejectError) {
                console.error('Error rejecting other applications:', rejectError);
                // Continue anyway as this is not critical
              }

              // Reload the job and applications
              await loadJobAndApplications();

              // Show success message
              alert("Application accepted successfully using alternative method! The job has been assigned to the worker.");
              return; // Exit the error handler since we've recovered
            } else {
              throw new Error('Worker ID is missing from the application');
            }
          } catch (fallbackErr) {
            console.error('Fallback method failed:', fallbackErr);
            errorMessage = "Could not update the application status even with alternative method. Please try again later.";
          }
        } else {
          // Use the original error message but make it more user-friendly
          errorMessage = err.message.replace("Failed to accept application: ", "");
        }
      }

      setError(errorMessage)

      // Reload the job and applications to ensure UI is in sync with database
      await loadJobAndApplications()
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
        .update({
          status: "rejected",
          updated_at: new Date().toISOString()
        })
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
                <span className="text-xs font-bold mr-1">KES</span>
                <span>
                  {job.budget_min === job.budget_max ? `${job.budget_min}` : `${job.budget_min} - ${job.budget_max}`}
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
                          <span className="text-xs font-bold mr-1">KES</span>
                          <span>Proposed: {application.proposed_rate}/hr</span>
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

