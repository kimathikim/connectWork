import React, { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { User, Mail, Phone, MapPin, Calendar, Star, MessageSquare, ArrowLeft, Briefcase, Clock, CheckCircle } from "lucide-react"

function CustomerProfilePage() {
  const { customerId } = useParams<{ customerId: string }>()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCustomerProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!customerId) {
          setError("Customer ID is missing")
          return
        }

        // Get customer profile
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", customerId)
          .eq("user_type", "customer")
          .single()

        if (error) throw error

        // Get customer's jobs
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select(`
            *,
            service:services(name)
          `)
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false })
          .limit(5)

        if (jobsError) throw jobsError

        setCustomer({ ...data, jobs: jobsData })
      } catch (err: any) {
        console.error("Error fetching customer profile:", err)
        setError("Failed to load customer profile. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchCustomerProfile()
  }, [customerId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <Briefcase className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC7357] mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-4">{error || "The customer profile you're looking for doesn't exist."}</p>
          <Link to="/" className="inline-block bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 mb-6 hover:text-[#CC7357]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </button>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Profile Header */}
          <div className="bg-[#CC7357] p-6 text-white">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center">
                {customer.avatar_url ? (
                  <img src={customer.avatar_url} alt={customer.full_name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-[#CC7357]" />
                )}
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold">{customer.full_name}</h1>
                <p className="text-white/80">Customer</p>
                <p className="text-white/80 flex items-center justify-center md:justify-start gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {customer.location || "Location not specified"}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <span>Member since {formatDate(customer.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Actions</h2>
                <div className="space-y-3">
                  <Link
                    to={`/messages?user=${customer.id}`}
                    className="flex items-center gap-2 bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors w-full justify-center"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Message Customer
                  </Link>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {customer.bio && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-4">About</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{customer.bio}</p>
                </div>
              </div>
            )}

            {/* Recent Jobs */}
            {customer.jobs && customer.jobs.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Recent Job Postings</h2>
                <div className="space-y-4">
                  {customer.jobs.map((job: any) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#CC7357] transition-colors">
                      <Link to={`/jobs/${job.id}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{job.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {job.service?.name} • Posted on {formatDate(job.created_at)}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {job.location}
                            </p>
                          </div>
                          <div className="flex items-center">
                            {getStatusIcon(job.status)}
                            <span className="ml-2 text-sm capitalize">{job.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        {job.description && (
                          <p className="mt-3 text-gray-700 line-clamp-2">{job.description}</p>
                        )}
                        <div className="mt-3 flex justify-between items-center">
                          <div className="text-sm font-medium text-gray-900">
                            KES {job.budget_min} - {job.budget_max}
                          </div>
                          <span className="text-[#CC7357] text-sm">View Details →</span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerProfilePage
