
"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Briefcase, MapPin, DollarSign, AlertCircle, CheckCircle, Info } from "lucide-react"
import { supabase, createJob, getServices } from "../lib/supabase"

function PostJobPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    service_id: "",
    budget_min: 0,
    budget_max: 0,
    urgency_level: "normal" as "low" | "normal" | "high" | "emergency",
  })

  useEffect(() => {
    checkAuth()
    loadServices()
  }, [])

  const checkAuth = async () => {
    try {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        navigate("/login", { state: { from: "/post-job" } })
        return
      }

      setUser(data.user)

      // Check if user is a customer
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", data.user.id)
        .single()

      if (profileError) throw profileError

      if (profileData.user_type !== "customer") {
        // Redirect to worker dashboard if not a customer
        navigate("/worker/dashboard")
        return
      }

      setLoading(false)
    } catch (error) {
      console.error("Error checking auth:", error)
      setLoading(false)
    }
  }

  const loadServices = async () => {
    try {
      const servicesData = await getServices()
      setServices(servicesData || [])
    } catch (error) {
      console.error("Error loading services:", error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === "budget_min" || name === "budget_max") {
      setFormData({ ...formData, [name]: Number.parseFloat(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError("Please enter a job title")
      return false
    }

    if (!formData.description.trim()) {
      setError("Please provide a job description")
      return false
    }

    if (!formData.location.trim()) {
      setError("Please enter a location")
      return false
    }

    if (!formData.service_id) {
      setError("Please select a service category")
      return false
    }

    if (formData.budget_min <= 0) {
      setError("Minimum budget must be greater than zero")
      return false
    }

    if (formData.budget_max < formData.budget_min) {
      setError("Maximum budget cannot be less than minimum budget")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setSubmitting(true)
      setError(null)

      const jobData = {
        ...formData,
        customer_id: user.id,
      }

      const result = await createJob(jobData)

      if (!result.success) {
        throw new Error(result.message)
      }

      // Show success message
      setSuccess(true)

      // Reset form
      setFormData({
        title: "",
        description: "",
        location: "",
        service_id: "",
        budget_min: 0,
        budget_max: 0,
        urgency_level: "normal",
      })

      // Redirect after a delay
      setTimeout(() => {
        navigate("/dashboard")
      }, 3000)
    } catch (err: any) {
      console.error("Error posting job:", err)
      setError(err.message || "Failed to post job. Please try again.")
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

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Posted Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your job has been posted and is now visible to workers. You'll be notified when you receive applications.
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Post a Job</h1>
            <p className="text-gray-600">Fill out the form below to post a new job</p>
          </div>

          {error && (
            <div className="bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Job Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                placeholder="e.g., Plumbing Repair for Bathroom Sink"
                required
              />
            </div>

            {/* Service Category */}
            <div>
              <label htmlFor="service_id" className="block text-sm font-medium text-gray-700 mb-1">
                Service Category
              </label>
              <select
                id="service_id"
                name="service_id"
                value={formData.service_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                required
              >
                <option value="">Select a category</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Job Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                placeholder="Describe the job in detail, including requirements and expectations..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Be specific about the job requirements to attract the right workers.
              </p>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                  placeholder="e.g., New York, NY"
                  required
                />
              </div>
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range ($)</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="budget_min"
                    name="budget_min"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget_min || ""}
                    onChange={handleChange}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="Min"
                    required
                  />
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="budget_max"
                    name="budget_max"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.budget_max || ""}
                    onChange={handleChange}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="Max"
                    required
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Set a realistic budget to attract qualified workers.</p>
            </div>

            {/* Urgency Level */}
            <div>
              <label htmlFor="urgency_level" className="block text-sm font-medium text-gray-700 mb-1">
                Urgency Level
              </label>
              <select
                id="urgency_level"
                name="urgency_level"
                value={formData.urgency_level}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                required
              >
                <option value="low">Low - Within a few weeks</option>
                <option value="normal">Normal - Within a week</option>
                <option value="high">High - Within a few days</option>
                <option value="emergency">Emergency - As soon as possible</option>
              </select>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Tips for Getting Great Applications</h3>
                  <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                    <li>Be specific about your requirements</li>
                    <li>Include clear photos if relevant</li>
                    <li>Set a realistic budget range</li>
                    <li>Respond promptly to worker questions</li>
                  </ul>
                </div>
              </div>
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
                    <span>Posting Job...</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="h-5 w-5" />
                    <span>Post Job</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PostJobPage

