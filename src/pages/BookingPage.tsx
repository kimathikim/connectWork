import React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation, useParams, useSearchParams, Link } from "react-router-dom"
import { Calendar, Clock, DollarSign, MapPin, AlertCircle, ChevronLeft } from "lucide-react"
import { supabase, createAppointment } from "../lib/supabase"

interface LocationState {
  workerId?: string
  serviceId?: string
}

function BookingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { jobId } = useParams<{ jobId: string }>()
  const [searchParams] = useSearchParams()
  const workerId = location.state?.workerId || searchParams.get('worker')
  const serviceId = location.state?.serviceId || searchParams.get('service')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [worker, setWorker] = useState<any>(null)
  const [service, setService] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [job, setJob] = useState<any>(null)
  const [workerServices, setWorkerServices] = useState<any[]>([])

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    address: "",
    notes: "",
    service_id: "", // Add this property
    rate: 0 // Add this if needed
  })

  useEffect(() => {
    console.log("BookingPage mounted with params:", { jobId, workerId, serviceId })
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log("Running checkAuth")
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        console.log("No user found, redirecting to login")
        navigate("/login", { state: { from: `/booking${jobId ? `/${jobId}` : ""}` } })
        return
      }

      setUser(data.user)
      console.log("User authenticated:", data.user.id)

      // Check if user is a customer
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_type, address")
        .eq("id", data.user.id)
        .single()

      if (profileError) throw profileError

      if (profileData.user_type !== "customer") {
        console.log("User is not a customer, redirecting")
        // Redirect to worker dashboard if not a customer
        navigate("/worker/dashboard")
        return
      }

      // Pre-fill address if available
      if (profileData.address) {
        setFormData(prev => ({ ...prev, address: profileData.address }))
      }

      console.log("About to load data with:", { jobId, workerId, serviceId })
      if (jobId) {
        console.log("Loading job details")
        await loadJobDetails()
      } else if (workerId) {
        console.log("Loading worker and service")
        await loadWorkerAndService()
      } else {
        console.log("Missing required information")
        setError("Missing required information to create booking")
      }

      setLoading(false)
    } catch (error) {
      console.error("Error checking auth:", error)
      setLoading(false)
    }
  }

  const loadJobDetails = async () => {
    try {
      if (!jobId) return

      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          service:services(*)
        `)
        .eq("id", jobId)
        .single()

      if (error) throw error

      setJob(data)
      setService(data.service)
      console.log(data.service)

      // Load worker details if this is a job application
      if (location.state?.workerId) {
        const { data: workerData, error: workerError } = await supabase
          .from("worker_profiles")
          .select(`
            *,
            profile:profiles(*)
          `)
          .eq("id", location.state.workerId)
          .single()

        if (workerError) throw workerError

        setWorker(workerData)
      }
    } catch (err) {
      console.error("Error loading job details:", err)
      setError("Failed to load job details. Please try again.")
    }
  }

  const loadWorkerAndService = async () => {
    try {
      if (!workerId) {
        setError("Missing worker information")
        return
      }

      console.log("Loading worker with ID:", workerId)

      // Load worker details with their services
      const { data: workerData, error: workerError } = await supabase
        .from("worker_profiles")
        .select(`
          *,
          profile:profiles!worker_profiles_id_fkey(*),
          services:worker_services(
            *,
            service:services(*)
          )
        `)
        .eq("id", workerId)
        .single()

      if (workerError) {
        console.error("Worker fetch error:", workerError)
        throw workerError
      }
      
      if (!workerData) {
        console.error("No worker data returned")
        throw new Error("Worker not found")
      }

      console.log("Raw worker data:", workerData)
      setWorker(workerData)

      // Check if worker has services
      if (!workerData.services || workerData.services.length === 0) {
        console.error("Worker has no services")
        throw new Error("This worker hasn't listed any services yet")
      }

      // Set worker services
      console.log("Setting worker services:", workerData.services)
      console.log("Worker services structure:", JSON.stringify(workerData.services, null, 2))
      console.log("First service details:", workerData.services[0]?.service)
      setWorkerServices(workerData.services)

      // If serviceId is provided, set the selected service
      if (serviceId) {
        console.log("Looking for service ID:", serviceId)
        const selectedWorkerService = workerData.services.find((ws: any) => ws.service_id === serviceId)
        if (selectedWorkerService) {
          console.log("Found selected service:", selectedWorkerService)
          setService(selectedWorkerService.service)
          setFormData(prev => ({
            ...prev,
            service_id: serviceId,
            rate: selectedWorkerService.rate
          }))
        } else {
          // Default to first service if specified service not found
          console.log("Service ID not found, defaulting to first service")
          setService(workerData.services[0].service)
          setFormData(prev => ({
            ...prev,
            service_id: workerData.services[0].service_id,
            rate: workerData.services[0].rate
          }))
        }
      } else {
        // Default to first service
        console.log("No service ID provided, defaulting to first service")
        setService(workerData.services[0].service)
        setFormData(prev => ({
          ...prev,
          service_id: workerData.services[0].service_id,
          rate: workerData.services[0].rate
        }))
      }
    } catch (err: any) {
      console.error("Error loading worker and services:", err)
      setError(`Failed to load booking information: ${err.message}`)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedServiceId = e.target.value
    const selectedWorkerService = workerServices.find(ws => ws.service_id === selectedServiceId)
    
    if (selectedWorkerService) {
      setService(selectedWorkerService.service)
      
      // Update form data with the selected service's rate
      setFormData(prev => ({
        ...prev,
        rate: selectedWorkerService.rate
      }))
    }
  }

  const validateForm = () => {
    if (!formData.date) {
      setError("Please select a date")
      return false
    }
    if (!formData.time) {
      setError("Please select a time")
      return false
    }
    if (!formData.address) {
      setError("Please provide an address")
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

      // Check if service data is available
      if (!service) {
        console.error("Service data is missing")
        setError("Service information is missing. Please try again.")
        return
      }

      // Find the worker's rate for this service
      const serviceId = service.id
      const workerService = workerServices.find((ws: any) => ws.service_id === serviceId)
      
      if (!workerService) {
        console.error("Could not find worker service for ID:", serviceId)
        setError("Could not find rate information for this service")
        return
      }

      console.log("Service data:", service)
      console.log("Worker service data:", workerService)
      console.log("Form data:", formData)

      // Create appointment using the helper function
      const appointmentData = {
        customer_id: user.id,
        worker_id: worker?.id,
        service_id: serviceId,
        date: formData.date,
        time: formData.time,
        address: formData.address,
        notes: formData.notes || undefined,
        status: "scheduled",
        service_name: service.name,
        service_price: workerService.rate
      }

      console.log("Submitting appointment data:", appointmentData)

      // Use the createAppointment function from supabase.ts
      const appointment = await createAppointment(appointmentData)

      // Only navigate after successful submission
      navigate("/booking-success", {
        state: {
          appointment: appointment,
          worker: worker,
          service: service,
          rate: workerService.rate
        }
      })
    } catch (err: any) {
      console.error("Error creating booking:", err)
      setError(err.message || "Failed to create booking. Please try again.")
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


  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link to={jobId ? `/jobs/${jobId}` : "/search"} className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to {jobId ? "Job Details" : "Search"}</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Book a Service</h1>
            <p className="text-gray-600 mt-1">
              {worker ? `Schedule an appointment with ${worker.profile.full_name}` : "Schedule your service appointment"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="p-6">
            {/* Service and Worker Info */}
            {(service || worker) && (
              <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                {service && (
                  <div className="flex items-start gap-4 mb-4">
                    <DollarSign className="h-6 w-6 text-[#CC7357]" />
                    <div>
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      <p className="text-gray-600">${service.base_price}/hour</p>
                    </div>
                  </div>
                )}
                
                {worker && (
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {worker.profile.avatar_url ? (
                        <img src={worker.profile.avatar_url} alt={worker.profile.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-gray-500">{worker.profile.full_name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{worker.profile.full_name}</h3>
                      <p className="text-gray-600">{worker.profile.location}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Service selection dropdown */}
                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type
                  </label>
                  <div className="relative">
                    <select
                      id="service"
                      name="service"
                      value={service?.id || ""}
                      onChange={handleServiceChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CC7357] focus:border-[#CC7357]"
                      required
                    >
                      <option value="">Select a service</option>
                      {workerServices.map((workerService) => (
                        <option key={workerService.service_id} value={workerService.service_id}>
                          {workerService.service.name} - ${workerService.rate}/hr
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Daaaute
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CC7357] focus:border-[#CC7357]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CC7357] focus:border-[#CC7357]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter the service location"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CC7357] focus:border-[#CC7357]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Any special instructions or details the worker should know"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#CC7357] focus:border-[#CC7357]"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#CC7357] text-white py-3 px-4 rounded-md hover:bg-[#B66347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC7357] disabled:opacity-75"
                  >
                    {submitting ? "Scheduling..." : "Schedule Appointment"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingPage
