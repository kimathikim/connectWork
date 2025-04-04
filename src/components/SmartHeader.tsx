import React, { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { WorkerHeader } from "./WorkerHeader"
import { CustomerHeader } from "./CustomerHeader"
import { Header } from "./Header" // Original header for non-logged in users

export function SmartHeader() {
  const location = useLocation()
  const [userType, setUserType] = useState<"worker" | "customer" | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUserType = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          setUserType(null)
          setLoading(false)
          return
        }

        // Get user profile to determine user type
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
          setUserType(null)
        } else {
          setUserType(profileData?.user_type as "worker" | "customer" | null)
        }

        setLoading(false)
      } catch (error) {
        console.error("Error in getUserType:", error)
        setUserType(null)
        setLoading(false)
      }
    }

    getUserType()
  }, [location.pathname]) // Re-check when path changes (e.g., after login/logout)

  // Show loading state or render appropriate header
  if (loading) {
    return (
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="animate-pulse bg-gray-200 h-8 w-40 rounded"></div>
            <div className="hidden md:flex space-x-4">
              <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
              <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
            </div>
          </div>
        </div>
      </header>
    )
  }

  // Render the appropriate header based on user type
  if (userType === "worker") {
    return <WorkerHeader />
  } else if (userType === "customer") {
    return <CustomerHeader />
  } else {
    return <Header /> // Default header for non-logged in users
  }
}


