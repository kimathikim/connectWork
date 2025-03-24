"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  AlertCircle,
  User,
  MessageSquare,
  Briefcase,
  ChevronLeft,
  Send,
} from "lucide-react"
import { supabase } from "../lib/supabase"
import { applyForJob } from "../lib/supabase"
import { StartConversationButton } from "../components/StartConversationButton";

interface Job {
  id: string
  title: string
  description: string
  location: string
  budget_min: number
  budget_max: number
  urgency_level: string
  status: string
  created_at: string
  customer: {
    id: string
    full_name: string
    avatar_url: string
  }
}

function JobDetailsPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [hasApplied, setHasApplied] = useState(false)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [coverLetter, setCoverLetter] = useState("")
  const [proposedRate, setProposedRate] = useState(job?.budget_min || 0)
  const [showMessageForm, setShowMessageForm] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchJobDetails()
    checkCurrentUser()
  }, [jobId])

  const checkCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setCurrentUser(user)

    if (user) {
      // Check if user has already applied to this job
      const { data: applications } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("worker_id", user.id)
        .single()

      setHasApplied(!!applications)
    }
  }

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!jobId) {
        setError("Job ID is missing")
        return
      }

      // Update the query to select only fields that exist
      const { data, error: fetchError } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:profiles(id, full_name)
        `)
        .eq("id", jobId)
        .single()

      if (fetchError) throw fetchError

      // Add default values for missing fields
      setJob({
        ...data,
        customer: {
          ...data.customer,
          avatar_url: data.customer?.avatar_url || null // Add default for missing avatar_url
        }
      })
    } catch (err) {
      console.error("Error fetching job details:", err)
      setError("Failed to load job details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsApplying(true)
      
      if (!currentUser || !jobId) {
        setError("You must be logged in to apply")
        return
      }
      
      await applyForJob(jobId, currentUser.id, coverLetter, proposedRate)
      
      setShowApplyForm(false)
      setHasApplied(true)
      alert("Application submitted successfully!")
    } catch (err: any) {
      console.error("Error applying for job:", err)
      setError(err.message || "Failed to submit application")
    } finally {
      setIsApplying(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (!currentUser || !job?.customer?.id || !message.trim()) {
        return
      }
      
      const { error } = await supabase.from("messages").insert({
        job_id: jobId,
        sender_id: currentUser.id,
        receiver_id: job.customer.id,
        content: message,
        created_at: new Date().toISOString()
      })
      
      if (error) throw error
      
      setMessage("")
      setShowMessageForm(false)
      alert("Message sent successfully!")
    } catch (err: any) {
      console.error("Error sending message:", err)
      alert("Failed to send message. Please try again.")
    }
  }

  const handleApplyForJob = () => {
    if (!currentUser) {
      navigate("/login", { state: { from: `/job/${jobId}` } });
      return;
    }
    
    if (hasApplied) {
      return; // Already applied
    }
    
    // Navigate to the dedicated application page instead of showing inline form
    navigate(`/apply/${jobId}`);
  };

  const navigateToMessages = () => {
    if (!currentUser) {
      navigate("/login", { state: { from: `/jobs/${jobId}` } });
      return;
    }
    
    if (job?.customer?.id) {
      navigate(`/messages?user=${job.customer.id}&job=${jobId}`);
    }
  };

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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Job</h2>
          <p className="text-gray-600 mb-6">{error || "This job could not be found or has been removed."}</p>
          <Link
            to="/search"
            className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      </div>
    )
  }

  // Format date
  const jobDate = new Date(job.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Map urgency level to a more user-friendly display
  const urgencyDisplay = {
    low: { label: "Low Priority", color: "bg-blue-100 text-blue-800" },
    normal: { label: "Normal Priority", color: "bg-green-100 text-green-800" },
    high: { label: "High Priority", color: "bg-orange-100 text-orange-800" },
    emergency: { label: "Emergency", color: "bg-red-100 text-red-800" },
  }[job.urgency_level] || { label: "Normal Priority", color: "bg-green-100 text-green-800" }

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/search" className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Jobs</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Job Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${urgencyDisplay.color}`}>
                    {urgencyDisplay.label}
                  </span>
                  <span className="text-gray-500 text-sm">Posted on {jobDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {currentUser?.id !== job.customer.id && (
                  <button
                    onClick={handleApplyForJob}
                    disabled={isApplying || hasApplied}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                      hasApplied
                        ? "bg-green-100 text-green-800 cursor-default"
                        : "bg-[#CC7357] text-white hover:bg-[#B66347]"
                    } transition-colors`}
                  >
                    {isApplying ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <Briefcase className="h-5 w-5" />
                    )}
                    <span>{hasApplied ? "Applied" : "Apply Now"}</span>
                  </button>
                )}

                <StartConversationButton 
                  userId={job.customer.id}
                  jobId={job.id}
                  variant="outline"
                  className="border-gray-300"
                  label="Message Customer"
                />
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
              </section>

              {/* Location */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Location</h2>
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <p className="text-gray-700">{job.location}</p>
                </div>
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Budget */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Budget</h3>
                <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <DollarSign className="h-5 w-5 text-[#CC7357]" />
                  {job.budget_min === job.budget_max ? (
                    <span>${job.budget_min}</span>
                  ) : (
                    <span>
                      ${job.budget_min} - ${job.budget_max}
                    </span>
                  )}
                </div>
              </div>

              {/* Client Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Client</h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200">
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
                  <div>
                    <p className="font-medium">{job.customer.full_name}</p>
                    <Link to={`/customer-profile/${job.customer.id}`} className="text-sm text-[#CC7357]">
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>

              {/* Job Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Job Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <span>Posted on {jobDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <span>Urgency: {urgencyDisplay.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Briefcase className="h-5 w-5 text-gray-500" />
                    <span>Status: {job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobDetailsPage

