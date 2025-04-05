
"use client"

import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { Star, MapPin, Clock, Briefcase, MessageSquare, ChevronLeft, User, Calendar, Shield, Award } from "lucide-react"
import { supabase } from "../lib/supabase"
import { Button } from "../components/StartConversationButton"
import { StartConversationButton } from "../components/StartConversationButton"

function WorkerProfilePage() {
  const { workerId } = useParams<{ workerId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [worker, setWorker] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    checkCurrentUser()
    loadWorkerProfile()
  }, [workerId])

  const checkCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getSession()
      setCurrentUser(data.session?.user || null)
    } catch (error) {
      console.error("Error checking current user:", error)
    }
  }

  const loadWorkerProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!workerId) {
        setError("Worker ID is missing")
        return
      }

      // Get worker profile
      const { data, error } = await supabase
        .from("worker_profiles")
        .select(`
          *,
          profile:profiles!worker_profiles_id_fkey(*),
          services:worker_services(
            *,
            service:services(*)
          ),
          availability:worker_availability(*)
        `)
        .eq("id", workerId)
        .single()

      if (error) throw error

      setWorker(data)

      // Get worker reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          *,
          reviewer:profiles!reviewer_id(id, full_name, avatar_url),
          job:jobs(id, title)
        `)
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false })
        .limit(3)

      if (reviewsError) throw reviewsError

      setReviews(reviewsData || [])
    } catch (err) {
      console.error("Error loading worker profile:", err)
      setError("Failed to load worker profile. Please try again.")
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

  const getAvailabilityDays = () => {
    if (!worker?.availability || worker.availability.length === 0) {
      return "Not specified"
    }

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const availableDays = worker.availability.map((slot: any) => daysOfWeek[slot.day_of_week])

    // Get unique days
    const uniqueDays = [...new Set(availableDays)]

    return uniqueDays.join(", ")
  }

  const handleBookNow = () => {
    navigate("/booking", {
      state: {
        workerId: worker.id,
        serviceId: worker.services?.[0]?.service?.id
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
      </div>
    )
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error || "This worker could not be found."}</p>
          <Link
            to="/search"
            className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
          >
            Back to Search
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to="/search" className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Search</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Worker Profile Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-8">
              <div className="p-6 text-center border-b border-gray-200">
                <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-200 mx-auto mb-4">
                  {worker.profile.avatar_url ? (
                    <img
                      src={worker.profile.avatar_url || "/placeholder.svg"}
                      alt={worker.profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-6xl font-medium">
                      {worker.profile.full_name.charAt(0)}
                    </div>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-gray-900">{worker.profile.full_name}</h1>
                <p className="text-[#6B8E23] font-medium mt-1">{worker.headline}</p>

                <div className="flex items-center justify-center mt-2">
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  <span className="ml-1 text-gray-700 font-medium">
                    {worker.rating ? worker.rating.toFixed(1) : "New"}
                    {worker.review_count > 0 && ` (${worker.review_count} reviews)`}
                  </span>
                </div>

                {worker.profile.location && (
                  <div className="flex items-center justify-center text-gray-500 mt-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{worker.profile.location}</span>
                  </div>
                )}
              </div>

              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Hourly Rate</h2>
                  <span className="text-xl font-bold text-gray-900">KES {worker.hourly_rate}/hr</span>
                </div>

                <div className="flex space-x-4 mt-6">
                  {currentUser?.id !== worker.id ? (
                    <>
                      <Button
                        variant="default"
                        onClick={handleBookNow}
                        className="bg-[#CC7357] hover:bg-[#B66347]"
                      >
                        Book Now
                      </Button>

                      <StartConversationButton
                        userId={worker.id}
                        variant="outline"
                        className="border-gray-300"
                        label="Message Worker"
                      />
                    </>
                  ) : (
                    <Link
                      to="/messages"
                      className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center"
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      View Messages
                    </Link>
                  )}
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Details</h2>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <Briefcase className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Experience</h3>
                      <p className="text-gray-900">{worker.years_experience} years</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Availability</h3>
                      <p className="text-gray-900">{getAvailabilityDays()}</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Response Time</h3>
                      <p className="text-gray-900">Usually within 24 hours</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <Shield className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Verified</h3>
                      <p className="text-gray-900">Identity Verified</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">About {worker.profile.full_name}</h2>
              </div>

              <div className="p-6">
                {worker.profile.bio ? (
                  <p className="text-gray-700 whitespace-pre-line">{worker.profile.bio}</p>
                ) : (
                  <p className="text-gray-500 italic">No bio provided</p>
                )}
              </div>
            </div>

            {/* Services Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Services Offered</h2>
              </div>

              <div className="p-6">
                {worker.services && worker.services.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {worker.services.map((service: any) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-medium text-gray-900">{service.service.name}</h3>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-gray-500">{service.service.category}</span>
                          <span className="font-bold text-gray-900">KES {service.rate}/hr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No services listed</p>
                )}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
                <Link to={`/reviews/${worker.id}`} className="text-[#CC7357] hover:text-[#B66347]">
                  View all reviews
                </Link>
              </div>

              <div className="divide-y divide-gray-200">
                {reviews.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No reviews yet</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {review.reviewer.avatar_url ? (
                            <img
                              src={review.reviewer.avatar_url || "/placeholder.svg"}
                              alt={review.reviewer.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-full w-full p-2 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <h3 className="font-medium text-gray-900">{review.reviewer.full_name}</h3>
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
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Credentials Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Credentials</h2>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <Award className="h-5 w-5 text-[#CC7357] mr-2" />
                      Certifications
                    </h3>

                    <ul className="space-y-2">
                      <li key="cert-1" className="flex items-center text-gray-700">
                        <span className="h-2 w-2 bg-[#CC7357] rounded-full mr-2"></span>
                        Professional {worker.headline} Certification
                      </li>
                      <li key="cert-2" className="flex items-center text-gray-700">
                        <span className="h-2 w-2 bg-[#CC7357] rounded-full mr-2"></span>
                        Safety Training Certification
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                      <Shield className="h-5 w-5 text-[#CC7357] mr-2" />
                      Verifications
                    </h3>

                    <ul className="space-y-2">
                      <li key="verify-1" className="flex items-center text-gray-700">
                        <span className="h-2 w-2 bg-[#CC7357] rounded-full mr-2"></span>
                        Identity Verified
                      </li>
                      <li key="verify-2" className="flex items-center text-gray-700">
                        <span className="h-2 w-2 bg-[#CC7357] rounded-full mr-2"></span>
                        Phone Verified
                      </li>
                      <li key="verify-3" className="flex items-center text-gray-700">
                        <span className="h-2 w-2 bg-[#CC7357] rounded-full mr-2"></span>
                        Email Verified
                      </li>
                    </ul>
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

export default WorkerProfilePage

