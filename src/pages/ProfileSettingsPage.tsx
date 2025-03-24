"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { User, Camera, MapPin, Phone, Mail, Save, AlertCircle } from "lucide-react"
import { supabase } from "../lib/supabase"

function ProfileSettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userType, setUserType] = useState<"customer" | "worker" | null>(null)

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    imageUrl: "",
  })

  // Worker-specific fields
  const [workerProfile, setWorkerProfile] = useState({
    profession: "",
    hourlyRate: 0,
    yearsExperience: 0,
    skills: [] as string[],
    certifications: [] as string[],
  })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login")
        return
      }

      // Get user metadata to determine user type
      const userMetadata = user.user_metadata
      setUserType(userMetadata?.user_type || "customer")

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError

      if (profileData) {
        setProfile({
          fullName: profileData.full_name || "",
          email: user.email || "",
          phone: profileData.phone || "",
          location: profileData.location || "",
          bio: profileData.bio || "",
          imageUrl: profileData.avatar_url || "",
        })
      }

      // If worker, fetch worker-specific profile
      if (userMetadata?.user_type === "worker") {
        const { data: workerData, error: workerError } = await supabase
          .from("worker_profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (workerError && workerError.code !== "PGRST116") {
          // PGRST116 is "no rows returned" error, which is fine for new workers
          throw workerError
        }

        if (workerData) {
          // Fetch skills separately
          const { data: skillsData } = await supabase
            .from("worker_skills")
            .select("skill")
            .eq("worker_id", user.id);

          // Fetch certifications separately
          const { data: certsData } = await supabase
            .from("worker_certifications")
            .select("certification")
            .eq("worker_id", user.id);

          setWorkerProfile({
            profession: workerData.profession || "",
            hourlyRate: workerData.hourly_rate || 0,
            yearsExperience: workerData.years_experience || 0,
            skills: skillsData?.map((s) => s.skill) || [],
            certifications: certsData?.map((c) => c.certification) || [],
          })
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
      setError("Failed to load profile data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login")
        return
      }

      // Update basic profile - include user_type to satisfy not-null constraint
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.fullName,
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
        avatar_url: profile.imageUrl,
        user_type: userType, // Add this line to include user_type
        updated_at: new Date(),
      })

      if (profileError) throw profileError

      // If worker, update worker profile
      if (userType === "worker") {
        const { error: workerError } = await supabase.from("worker_profiles").upsert({
          id: user.id,
          profession: workerProfile.profession,
          hourly_rate: workerProfile.hourlyRate,
          years_experience: workerProfile.yearsExperience,
          updated_at: new Date(),
        })

        if (workerError) throw workerError

        // Handle skills and certifications (this is simplified)
        // In a real app, you'd need to handle deleting removed skills/certs
        // and adding new ones
      }

      // Show success message or redirect
      alert("Profile updated successfully!")
    } catch (err) {
      console.error("Error saving profile:", err)
      setError("Failed to save profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)

      // Upload image to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

      if (data) {
        setProfile({
          ...profile,
          imageUrl: data.publicUrl,
        })
      }
    } catch (err) {
      console.error("Error uploading image:", err)
      alert("Error uploading image. Please try again.")
    } finally {
      setLoading(false)
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
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600">Manage your personal information and account settings</p>
          </div>

          {error && (
            <div className="bg-red-50 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="p-6 space-y-6">
            {/* Profile Image */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100">
                  {profile.imageUrl ? (
                    <img
                      src={profile.imageUrl || "/placeholder.svg"}
                      alt={profile.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-full w-full p-4 text-gray-400" />
                  )}
                </div>
                <label
                  htmlFor="profile-image"
                  className="absolute bottom-0 right-0 bg-[#CC7357] text-white p-1.5 rounded-full cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                </label>
                <input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="flex-1">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                  placeholder="Your full name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-2.5 left-3 h-5 w-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      placeholder="Your email address"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Contact support to change email</p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute top-2.5 left-3 h-5 w-5 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute top-2.5 left-3 h-5 w-5 text-gray-400" />
                  <input
                    id="location"
                    type="text"
                    value={profile.location}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="City, State"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                  placeholder="Tell us a bit about yourself..."
                />
              </div>
            </div>

            {/* Worker-specific fields */}
            {userType === "worker" && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">Professional Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1">
                      Profession
                    </label>
                    <input
                      id="profession"
                      type="text"
                      value={workerProfile.profession}
                      onChange={(e) => setWorkerProfile({ ...workerProfile, profession: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                      placeholder="e.g., Plumber, Electrician"
                    />
                  </div>

                  <div>
                    <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate ($)
                    </label>
                    <input
                      id="hourlyRate"
                      type="number"
                      min="0"
                      value={workerProfile.hourlyRate}
                      onChange={(e) => setWorkerProfile({ ...workerProfile, hourlyRate: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                      placeholder="Your hourly rate"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    id="yearsExperience"
                    type="number"
                    min="0"
                    value={workerProfile.yearsExperience}
                    onChange={(e) => setWorkerProfile({ ...workerProfile, yearsExperience: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="Years of professional experience"
                  />
                </div>

                {/* Skills and certifications would be more complex in a real app */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                  <p className="text-sm text-gray-500 mb-2">Enter your skills separated by commas</p>
                  <input
                    type="text"
                    value={workerProfile.skills.join(", ")}
                    onChange={(e) => {
                      const skillsArray = e.target.value
                        .split(",")
                        .map((skill) => skill.trim())
                        .filter(Boolean)
                      setWorkerProfile({ ...workerProfile, skills: skillsArray })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="e.g., Pipe Installation, Leak Detection"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certifications</label>
                  <p className="text-sm text-gray-500 mb-2">Enter your certifications separated by commas</p>
                  <input
                    type="text"
                    value={workerProfile.certifications.join(", ")}
                    onChange={(e) => {
                      const certsArray = e.target.value
                        .split(",")
                        .map((cert) => cert.trim())
                        .filter(Boolean)
                      setWorkerProfile({ ...workerProfile, certifications: certsArray })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="e.g., Master Plumber License, Gas Fitting Certificate"
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4">
              <button
                type="submit"
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
                    <span>Save Changes</span>
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

export default ProfileSettingsPage

