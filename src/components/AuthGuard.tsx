"use client"

import React from "react"
import { useEffect, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { supabase, getUserType } from "../lib/supabase"

interface AuthGuardProps {
  children: React.ReactNode
  requiredUserType?: "customer" | "worker" | null // null means any authenticated user
}

function AuthGuard({ children, requiredUserType = null }: AuthGuardProps) {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userType, setUserType] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        checkUserType(session.user.id)
      } else if (event === "SIGNED_OUT") {
        setAuthenticated(false)
        setUserType(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkAuth = async () => {
    try {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setAuthenticated(true)
        await checkUserType(data.session.user.id)
      } else {
        setAuthenticated(false)
        setUserType(null)
      }
    } catch (error) {
      console.error("Auth check error:", error)
      setAuthenticated(false)
      setUserType(null)
    } finally {
      setLoading(false)
    }
  }

  const checkUserType = async (userId: string) => {
    try {
      const userType = await getUserType(userId)
      setUserType(userType)
    } catch (error) {
      console.error("Error getting user type:", error)
      setUserType(null)
    }
  }

  if (loading) {
    // You could return a loading spinner here
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
      </div>
    )
  }

  // Not authenticated, redirect to login
  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Check user type if required
  if (requiredUserType && userType !== requiredUserType) {
    // Redirect to appropriate dashboard based on user type
    if (userType === "worker") {
      return <Navigate to="/worker/dashboard" replace />
    } else {
      return <Navigate to="/dashboard" replace />
    }
  }

  // User is authenticated and has the required user type (or no specific type is required)
  return <>{children}</>
}

export default AuthGuard

