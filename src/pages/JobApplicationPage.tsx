"use client"

import React, { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { applyForJob } from "../lib/supabase"
import { ChevronLeft, Briefcase, DollarSign, MapPin } from "lucide-react"

function JobApplicationPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [coverLetter, setCoverLetter] = useState("")
  const [proposedRate, setProposedRate] = useState(0)
  
  useEffect(() => {
    fetchJobDetails()
    checkCurrentUser()
  }, [jobId])
  
  const fetchJobDetails = async () => {
    try {
      if (!jobId) return
      
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          customer:profiles!customer_id(*)
        `)
        .eq("id", jobId)
        .single()
        
      if (error) throw error
      
      setJob(data)
      setProposedRate(data.budget_min || 0)
    } catch (err) {
      console.error("Error fetching job:", err)
      setError("Failed to load job details")
    } finally {
      setLoading(false)
    }
  }
  
  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    
    if (user) {
      // Check if user has already applied
      const { data } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("worker_id", user.id)
        .single()
        
      if (data) {
        // Already applied, redirect back to job
        navigate(`/jobs/${jobId}`, { state: { alreadyApplied: true } })
      }
    } else {
      // Not logged in, redirect to login
      navigate("/login", { state: { from: `/apply/${jobId}` } })
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSubmitting(true)
      setError(null)
      
      if (!currentUser || !jobId) {
        setError("You must be logged in to apply")
        return
      }
      
      if (!coverLetter.trim()) {
        setError("Please provide a cover letter")
        return
      }
      
      await applyForJob(jobId, currentUser.id, coverLetter, proposedRate)
      
      // Redirect back to job with success message
      navigate(`/jobs/${jobId}`, { state: { applicationSuccess: true } })
    } catch (err: any) {
      console.error("Error applying for job:", err)
      setError(err.message || "Failed to submit application")
    } finally {
      setSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
      </div>
    )
  }
  
  if (!job) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          <p className="text-red-500">{error || "Job not found"}</p>
          <Link to="/worker/find-jobs" className="text-[#CC7357] hover:underline mt-4 inline-block">
            <ChevronLeft className="h-4 w-4 inline mr-1" />
            Back to Jobs
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#F5F5DC] p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <Link to={`/jobs/${jobId}`} className="text-[#CC7357] hover:underline mb-4 inline-block">
            <ChevronLeft className="h-4 w-4 inline mr-1" />
            Back to Job Details
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Apply for: {job.title}</h1>
          
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
              {job.location}
            </div>
            
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
              ${job.budget_min} - ${job.budget_max}
            </div>
            
            <div className="flex items-center">
              <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
              {job.status}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-md">
                {error}
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Proposed Rate ($ per hour)
              </label>
              <input
                type="number"
                min={1}
                value={proposedRate}
                onChange={(e) => setProposedRate(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Suggested range: ${job.budget_min} - ${job.budget_max}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Cover Letter
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                placeholder="Introduce yourself and explain why you're a good fit for this job..."
                required
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  "Submit Application"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default JobApplicationPage