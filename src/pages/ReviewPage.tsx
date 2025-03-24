"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Star, ChevronLeft, Send, AlertCircle, CheckCircle } from "lucide-react"
import { supabase } from "../lib/supabase"

function ReviewPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [worker, setWorker] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")

  useEffect(() => {
    loadJobDetails()
  }, [jobId])

  const loadJobDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!jobId) {
        setError("Job ID is missing")
        return
      }

      // Check if user is authorized to review this job
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login", { state: { from: `/review/${jobId}` } })
        return
      }

      // Get job details with assigned worker information
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select(`
          *,
          service:services(*),
          assigned_worker:worker_profiles!jobs_assigned_worker_id_fkey(
            *,
            profile:profiles!worker_profiles_id_fkey(*)
          ),
          applications:job_applications(
            *,
            worker:worker_profiles(
              *,
              profile:profiles!worker_profiles_id_fkey(*)
            )
          )
        `)
        .eq("id", jobId)
        .eq("customer_id", user.id)
        .eq("status", "completed")
        .single()

      if (jobError) {
        if (jobError.code === "PGRST116") {
          setError("Job not found or you're not authorized to review it")
        } else {
          throw jobError
        }
        return
      }

      // Check if job has already been reviewed
      const { data: existingReview, error: reviewError } = await supabase
        .from("reviews")
        .select("*")
        .eq("job_id", jobId)
        .eq("reviewer_id", user.id)
        .maybeSingle()

      if (reviewError) throw reviewError

      if (existingReview) {
        setError("You have already submitted a review for this job")
        return
      }

      setJob(jobData)

      // First try to get worker from assigned_worker_id
      if (jobData.assigned_worker && jobData.assigned_worker.id) {
        setWorker(jobData.assigned_worker)
        return
      }

      // Fallback: Find the accepted worker from applications
      const acceptedApplication = jobData.applications.find((app: any) => app.status === "accepted")

      if (!acceptedApplication || !acceptedApplication.worker) {
        setError("No worker was assigned to this job")
        return
      }

      setWorker(acceptedApplication.worker)
    } catch (err) {
      console.error("Error loading job details:", err)
      setError("Failed to load job details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!comment.trim()) {
      setError("Please provide a comment for your review")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login")
        return
      }

      // Create review with basic fields
      const reviewData = {
        job_id: jobId,
        reviewer_id: user.id,
        worker_id: worker.id,
        rating,
        comment,
        created_at: new Date().toISOString(),
      }

      // Try to add helpful counts if columns exist
      try {
        const { error: reviewError } = await supabase.from("reviews").insert({
          ...reviewData,
          helpful_count: 0,
          unhelpful_count: 0,
        })

        if (reviewError) throw reviewError
      } catch (countError) {
        // If helpful_count columns don't exist yet, try without them
        console.warn("Helpful count columns not available, inserting without them:", countError)
        const { error: basicReviewError } = await supabase.from("reviews").insert(reviewData)
        
        if (basicReviewError) throw basicReviewError
      }

      // Update job to mark as reviewed
      // Don't try to update a non-existent 'reviewed' column
      // const { error: jobUpdateError } = await supabase.from("jobs").update({ reviewed: true }).eq("id", jobId)
      
      // Instead, update the job status if needed
      const { error: jobUpdateError } = await supabase
        .from("jobs")
        .update({ status: "completed" })
        .eq("id", jobId)

      if (jobUpdateError) throw jobUpdateError

      // Update worker rating
      await updateWorkerRating(worker.id)

      setSuccess(true)

      // Redirect after a delay
      setTimeout(() => {
        navigate("/dashboard")
      }, 3000)
    } catch (err) {
      console.error("Error submitting review:", err)
      setError("Failed to submit review. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const updateWorkerRating = async (workerId: string) => {
    try {
      // Get all reviews for this worker
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("rating")
        .eq("worker_id", workerId)

      if (reviewsError) throw reviewsError

      if (!reviews || reviews.length === 0) return

      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
      const averageRating = totalRating / reviews.length

      // Update worker profile
      const { error: updateError } = await supabase
        .from("worker_profiles")
        .update({
          rating: averageRating,
          review_count: reviews.length,
        })
        .eq("id", workerId)

      if (updateError) throw updateError
    } catch (err) {
      console.error("Error updating worker rating:", err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
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

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for your feedback. Your review helps other customers find great workers.
          </p>
          <p className="text-gray-500 mb-6">You will be redirected to your dashboard shortly.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Leave a Review</h1>
            <p className="text-gray-600 mt-1">
              Share your experience working with {worker?.profile?.full_name} on "{job?.title}"
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center mb-8">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-200 mr-4">
                {worker?.profile?.avatar_url ? (
                  <img
                    src={worker.profile.avatar_url || "/placeholder.svg"}
                    alt={worker.profile.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-4xl font-medium">
                    {worker?.profile?.full_name.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">{worker?.profile?.full_name}</h2>
                <p className="text-[#6B8E23]">{worker?.profession}</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 p-4 rounded-md flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate your experience?
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" onClick={() => setRating(value)} className="focus:outline-none">
                      <Star
                        className={`h-8 w-8 ${value <= rating ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-gray-700 font-medium">{rating} out of 5</span>
                </div>
              </div>

              {/* Review Comment */}
              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  id="comment"
                  rows={5}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                  placeholder="Share details of your experience working with this professional..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your review will be public and helps other customers make informed decisions.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#CC7357] hover:bg-[#B66347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC7357] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Submit Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewPage


