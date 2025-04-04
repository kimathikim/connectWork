"use client"

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, Phone, Mail, Save, AlertCircle } from "lucide-react"
import { supabase } from "../lib/supabase"
import { useToast } from "../components/ui/toast"
import { ImageUpload } from "../components/ui/image-upload"
import { uploadImage } from "../lib/image-upload"

function ProfileSettingsPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userType, setUserType] = useState<"customer" | "worker" | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  // Basic profile state
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    avatarUrl: "",
  })

  // Worker-specific fields
  const [workerProfile, setWorkerProfile] = useState({
    headline: "",
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
        addToast("Please log in to view your profile", "info")
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
          avatarUrl: profileData.avatar_url || "",
        })
      }

      // If worker, fetch worker-specific profile
      if (profileData.user_type === "worker") {
        setUserType("worker")

        // Fetch worker profile
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
            headline: workerData.headline || "",
            hourlyRate: workerData.hourly_rate || 0,
            yearsExperience: workerData.years_experience || 0,
            skills: skillsData?.map((s) => s.skill) || [],
            certifications: certsData?.map((c) => c.certification) || [],
          })
        }
      }

      addToast("Profile loaded successfully", "success")
    } catch (err: any) {
      console.error("Error fetching profile:", err)
      setError("Failed to load profile data. Please try again.")
      addToast(err.message || "Failed to load profile data", "error")
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
        addToast("Please log in to update your profile", "info")
        navigate("/login")
        return
      }

      // If there's an avatar file, upload it first
      let avatarUrl = profile.avatarUrl;
      if (avatarFile) {
        try {
          // Use our image upload utility that handles errors gracefully
          avatarUrl = await uploadImage(avatarFile);
        } catch (err) {
          console.error("Error uploading image:", err);
          addToast("Error uploading image. Using temporary image instead.", "error");
          // Continue with the profile update even if image upload fails
        }
      }

      // Update basic profile - include user_type and email to satisfy not-null constraints
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.fullName,
        email: profile.email, // Include email to satisfy not-null constraint
        phone: profile.phone,
        location: profile.location,
        bio: profile.bio,
        avatar_url: avatarUrl,
        user_type: userType, // Add this line to include user_type
        updated_at: new Date(),
      })

      if (profileError) throw profileError

      // If worker, update worker profile
      if (userType === "worker") {
        const { error: workerError } = await supabase.from("worker_profiles").upsert({
          id: user.id,
          headline: workerProfile.headline,
          hourly_rate: workerProfile.hourlyRate,
          years_experience: workerProfile.yearsExperience,
          updated_at: new Date(),
        })

        if (workerError) throw workerError

        // Handle skills and certifications (this is simplified)
        // In a real app, you'd need to handle deleting removed skills/certs
        // and adding new ones
      }

      // Show success message
      addToast("Profile updated successfully!", "success")

      // Reset avatar file after successful save
      setAvatarFile(null)
    } catch (err: any) {
      console.error("Error saving profile:", err)
      setError("Failed to save profile. Please try again.")
      addToast(err.message || "Failed to save profile", "error")
    } finally {
      setSaving(false)
    }
  }

  // Handle image upload from ImageUpload component
  const handleImageUpload = (url: string) => {
    setProfile({
      ...profile,
      avatarUrl: url,
    })
    // Reset avatar file after successful upload
    setAvatarFile(null)
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
      <div className="max-w-4xl mx-auto">
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
              <ImageUpload
                currentImageUrl={profile.avatarUrl}
                onImageUploaded={handleImageUpload}
                onFileSelected={(file) => setAvatarFile(file)}
                size="lg"
                shape="circle"
              />

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

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="phone"
                    type="tel"
                    value={profile.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="Your phone number"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    id="location"
                    type="text"
                    value={profile.location || ""}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                placeholder="Tell us about yourself"
                rows={4}
              />
            </div>

            {/* Worker-specific fields */}
            {userType === "worker" && (
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Professional Information</h2>

                <div>
                  <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
                    Professional Headline
                  </label>
                  <input
                    id="headline"
                    type="text"
                    value={workerProfile.headline}
                    onChange={(e) => setWorkerProfile({ ...workerProfile, headline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                    placeholder="e.g., Professional Plumber with 5 years experience"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate (KES)
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
                      placeholder="Years of experience"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 bg-[#CC7357] text-white rounded-md hover:bg-[#B66347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC7357] flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Changes
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
