"use client"
import React from "react"
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { Star, User, ThumbsUp, ThumbsDown, ChevronLeft } from "lucide-react"
import { supabase } from "../lib/supabase"

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  reviewer: {
    id: string
    name: string
    avatar_url: string
  }
  job: {
    id: string
    title: string
  }
  helpful_count: number
  unhelpful_count: number
}

function ReviewsPage() {
  const { workerId } = useParams<{ workerId: string }>()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workerName, setWorkerName] = useState("")
  const [averageRating, setAverageRating] = useState(0)
  const [ratingCounts, setRatingCounts] = useState<number[]>([0, 0, 0, 0, 0])
  const [filter, setFilter] = useState<number | null>(null)

  useEffect(() => {
    fetchWorkerDetails()
    fetchReviews()
  }, [workerId])

  const fetchWorkerDetails = async () => {
    try {
      if (!workerId) return

      const { data, error } = await supabase.from("profiles").select("full_name").eq("id", workerId).single()

      if (error) throw error

      setWorkerName(data?.full_name || "Worker")
    } catch (err) {
      console.error("Error fetching worker details:", err)
    }
  }

  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!workerId) {
        setError("Worker ID is missing")
        return
      }

      // Fetch reviews
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url),
          job:jobs(id, title)
        `)
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Transform data
      const transformedReviews = data.map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        reviewer: {
          id: review.reviewer.id,
          name: review.reviewer.full_name,
          avatar_url: review.reviewer.avatar_url,
        },
        job: {
          id: review.job.id,
          title: review.job.title,
        },
        helpful_count: review.helpful_count || 0,
        unhelpful_count: review.unhelpful_count || 0,
      }))

      setReviews(transformedReviews)

      // Calculate average rating
      if (transformedReviews.length > 0) {
        const totalRating = transformedReviews.reduce((sum, review) => sum + review.rating, 0)
        setAverageRating(totalRating / transformedReviews.length)

        // Calculate rating counts
        const counts = [0, 0, 0, 0, 0]
        transformedReviews.forEach((review) => {
          if (review.rating >= 1 && review.rating <= 5) {
            counts[review.rating - 1]++
          }
        })
        setRatingCounts(counts)
      }
    } catch (err) {
      console.error("Error fetching reviews:", err)
      setError("Failed to load reviews. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRatingFilter = (rating: number | null) => {
    setFilter(rating === filter ? null : rating)
  }

  const handleHelpfulVote = async (reviewId: string, isHelpful: boolean) => {
    try {
      // In a real app, you would track which reviews a user has voted on
      // and prevent multiple votes on the same review

      const field = isHelpful ? "helpful_count" : "unhelpful_count"

      // Update the review in the database
      const { error } = await supabase
        .from("reviews")
        .update({ [field]: supabase.rpc("increment", { inc: 1 }) })
        .eq("id", reviewId)

      if (error) throw error

      // Update the local state
      setReviews(
        reviews.map((review) => {
          if (review.id === reviewId) {
            return {
              ...review,
              [isHelpful ? "helpful_count" : "unhelpful_count"]:
                review[isHelpful ? "helpful_count" : "unhelpful_count"] + 1,
            }
          }
          return review
        }),
      )
    } catch (err) {
      console.error("Error voting on review:", err)
      alert("Failed to register your vote. Please try again.")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const filteredReviews = filter ? reviews.filter((review) => Math.round(review.rating) === filter) : reviews

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={`/worker-profile/${workerId}`} className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Profile</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Reviews Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Reviews for {workerName}</h1>

            <div className="mt-4 flex flex-col md:flex-row md:items-center gap-6">
              {/* Average Rating */}
              <div className="flex flex-col items-center">
                <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                <div className="flex items-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${star <= Math.round(averageRating) ? "text-yellow-400 fill-current" : "text-gray-300"
                        }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                </div>
              </div>

              {/* Rating Breakdown */}
              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = ratingCounts[rating - 1]
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0

                  return (
                    <div key={rating} className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => handleRatingFilter(rating)}
                        className={`flex items-center gap-1 ${filter === rating ? "font-medium text-[#CC7357]" : "text-gray-700"
                          }`}
                      >
                        <span>{rating}</span>
                        <Star
                          className={`h-4 w-4 ${filter === rating ? "text-[#CC7357] fill-current" : "text-gray-400"}`}
                        />
                      </button>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="text-sm text-gray-500 min-w-[30px]">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {filter && (
              <div className="mt-4 flex items-center">
                <span className="text-sm text-gray-700 mr-2">Showing {filter}-star reviews</span>
                <button onClick={() => setFilter(null)} className="text-sm text-[#CC7357] hover:underline">
                  Clear filter
                </button>
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-500">{error}</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">{filter ? `No ${filter}-star reviews yet` : "No reviews yet"}</p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <div key={review.id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {review.reviewer.avatar_url ? (
                        <img
                          src={review.reviewer.avatar_url || "/placeholder.svg"}
                          alt={review.reviewer.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-full w-full p-2 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{review.reviewer.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${star <= review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                    }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-500">
                          Job:{" "}
                          <Link to={`/jobs/${review.job.id}`} className="text-[#CC7357] hover:underline">
                            {review.job.title}
                          </Link>
                        </div>
                      </div>

                      <p className="mt-3 text-gray-700">{review.comment}</p>

                      <div className="mt-4 flex items-center gap-4">
                        <button
                          onClick={() => handleHelpfulVote(review.id, true)}
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#CC7357]"
                        >
                          <ThumbsUp className="h-4 w-4" />
                          <span>Helpful ({review.helpful_count})</span>
                        </button>

                        <button
                          onClick={() => handleHelpfulVote(review.id, false)}
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#CC7357]"
                        >
                          <ThumbsDown className="h-4 w-4" />
                          <span>Not helpful ({review.unhelpful_count})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewsPage

