"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { PenToolIcon as Tool, Plus, Trash, ChevronLeft, Save, AlertCircle } from "lucide-react"
import { getCurrentUser, getUserProfile, getServices, updateWorkerServices, supabase } from "../../lib/supabase"
import React from "react"

function WorkerServicesPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [workerServices, setWorkerServices] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        navigate("/login", { state: { from: "/worker/services" } })
        return
      }

      setUser(currentUser)

      // Get user profile
      const userProfile = await getUserProfile(currentUser.id)

      if (userProfile.user_type !== "worker") {
        // Redirect to customer dashboard if not a worker
        navigate("/dashboard")
        return
      }

      // Load services and worker services
      await Promise.all([loadServices(), loadWorkerServices(currentUser.id)])

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

  const loadWorkerServices = async (userId: string) => {
    try {
      // In a real app, you would fetch the worker's services from the database
      // This is a simplified example
      const { data } = await supabase.from("worker_services").select("*").eq("worker_id", userId)

      setWorkerServices(data || [])
    } catch (error) {
      console.error("Error loading worker services:", error)
    }
  }

  const handleAddService = () => {
    // Add a new empty service to the list
    setWorkerServices([
      ...workerServices,
      {
        id: `temp-${Date.now()}`,
        worker_id: user.id,
        service_id: "",
        rate: 0,
        isNew: true,
      },
    ])
  }

  const handleRemoveService = (index: number) => {
    const updatedServices = [...workerServices]
    updatedServices.splice(index, 1)
    setWorkerServices(updatedServices)
  }

  const handleServiceChange = (index: number, field: string, value: any) => {
    const updatedServices = [...workerServices]
    updatedServices[index] = {
      ...updatedServices[index],
      [field]: value,
    }
    setWorkerServices(updatedServices)
  }

  const handleSaveServices = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate services
      const invalidServices = workerServices.filter((service) => !service.service_id || service.rate <= 0)

      if (invalidServices.length > 0) {
        setError("Please select a service and enter a valid rate for all services.")
        setSaving(false)
        return
      }

      // Format services for the API
      const formattedServices = workerServices.map((service) => ({
        service_id: service.service_id,
        rate: service.rate,
      }))

      // Update services
      await updateWorkerServices(user.id, formattedServices)

      // Show success message
      alert("Services updated successfully!")

      // Reload services
      await loadWorkerServices(user.id)
    } catch (error) {
      console.error("Error saving services:", error)
      setError("Failed to save services. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const getServiceNameById = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId)
    return service ? service.name : ""
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
          <Link to="/worker/dashboard" className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Services</h1>
          <p className="text-gray-600 mt-2">Add and update the services you offer to clients</p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Your Services</h2>
            <button
              onClick={handleAddService}
              className="flex items-center gap-2 bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </button>
          </div>

          {error && (
            <div className="bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="p-6">
            {workerServices.length === 0 ? (
              <div className="text-center py-8">
                <Tool className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No services added yet</h3>
                <p className="text-gray-500 mb-6">Add the services you offer to start receiving job requests.</p>
                <button
                  onClick={handleAddService}
                  className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
                >
                  Add Your First Service
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {workerServices.map((service, index) => (
                  <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                        <select
                          value={service.service_id}
                          onChange={(e) => handleServiceChange(index, "service_id", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                        >
                          <option value="">Select a service</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full md:w-1/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={service.rate}
                          onChange={(e) => handleServiceChange(index, "rate", Number.parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => handleRemoveService(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                          aria-label="Remove service"
                        >
                          <Trash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4">
                  <button
                    onClick={handleSaveServices}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#CC7357] hover:bg-[#B66347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC7357] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>Save Services</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkerServicesPage

