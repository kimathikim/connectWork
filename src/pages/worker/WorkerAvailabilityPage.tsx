"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Calendar, ChevronLeft, Save, Plus, Trash, AlertCircle } from "lucide-react"
import { getCurrentUser, getUserProfile, updateWorkerAvailability, supabase } from "../../lib/supabase"
import React from "react"

function WorkerAvailabilityPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [availability, setAvailability] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser) {
        navigate("/login", { state: { from: "/worker/availability" } })
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

      // Load worker availability
      await loadWorkerAvailability(currentUser.id)

      setLoading(false)
    } catch (error) {
      console.error("Error checking auth:", error)
      setLoading(false)
    }
  }

  const loadWorkerAvailability = async (userId: string) => {
    try {
      // In a real app, you would fetch the worker's availability from the database
      // This is a simplified example
      const { data } = await supabase
        .from("worker_availability")
        .select("*")
        .eq("worker_id", userId)
        .order("day_of_week", { ascending: true })

      setAvailability(data || [])
    } catch (error) {
      console.error("Error loading worker availability:", error)
    }
  }

  const handleAddTimeSlot = () => {
    // Add a new empty time slot to the list
    setAvailability([
      ...availability,
      {
        id: `temp-${Date.now()}`,
        worker_id: user.id,
        day_of_week: 1, // Monday by default
        start_time: "09:00",
        end_time: "17:00",
        isNew: true,
      },
    ])
  }

  const handleRemoveTimeSlot = (index: number) => {
    const updatedAvailability = [...availability]
    updatedAvailability.splice(index, 1)
    setAvailability(updatedAvailability)
  }

  const handleTimeSlotChange = (index: number, field: string, value: any) => {
    const updatedAvailability = [...availability]
    updatedAvailability[index] = {
      ...updatedAvailability[index],
      [field]: value,
    }
    setAvailability(updatedAvailability)
  }

  const validateTimeSlots = () => {
    for (const slot of availability) {
      // Check if end time is after start time
      if (slot.start_time >= slot.end_time) {
        setError("End time must be after start time for all time slots.")
        return false
      }
    }

    // Check for overlapping time slots on the same day
    for (let i = 0; i < availability.length; i++) {
      for (let j = i + 1; j < availability.length; j++) {
        const slotA = availability[i]
        const slotB = availability[j]

        if (slotA.day_of_week === slotB.day_of_week) {
          // Check if slots overlap
          if (
            (slotA.start_time <= slotB.start_time && slotB.start_time < slotA.end_time) ||
            (slotB.start_time <= slotA.start_time && slotA.start_time < slotB.end_time)
          ) {
            setError("You have overlapping time slots on the same day.")
            return false
          }
        }
      }
    }

    return true
  }

  const handleSaveAvailability = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate time slots
      if (!validateTimeSlots()) {
        setSaving(false)
        return
      }

      // Format availability for the API
      const formattedAvailability = availability.map((slot) => ({
        day_of_week: Number.parseInt(slot.day_of_week.toString()),
        start_time: slot.start_time,
        end_time: slot.end_time,
      }))

      // Update availability
      await updateWorkerAvailability(user.id, formattedAvailability)

      // Show success message
      alert("Availability updated successfully!")

      // Reload availability
      await loadWorkerAvailability(user.id)
    } catch (error) {
      console.error("Error saving availability:", error)
      setError("Failed to save availability. Please try again.")
    } finally {
      setSaving(false)
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
          <Link to="/worker/dashboard" className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Set Your Availability</h1>
          <p className="text-gray-600 mt-2">Define when you're available to work</p>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Weekly Schedule</h2>
            <button
              onClick={handleAddTimeSlot}
              className="flex items-center gap-2 bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Time Slot
            </button>
          </div>

          {error && (
            <div className="bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="p-6">
            {availability.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No availability set</h3>
                <p className="text-gray-500 mb-6">Add your working hours to let clients know when you're available.</p>
                <button
                  onClick={handleAddTimeSlot}
                  className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
                >
                  Add Your First Time Slot
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {availability.map((slot, index) => (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="w-full md:w-1/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                        <select
                          value={slot.day_of_week}
                          onChange={(e) => handleTimeSlotChange(index, "day_of_week", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                        >
                          {daysOfWeek.map((day, i) => (
                            <option key={i} value={i}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full md:w-1/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => handleTimeSlotChange(index, "start_time", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() => handleRemoveTimeSlot(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                          aria-label="Remove time slot"
                        >
                          <Trash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-4">
                  <button
                    onClick={handleSaveAvailability}
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
                        <span>Save Availability</span>
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

export default WorkerAvailabilityPage

