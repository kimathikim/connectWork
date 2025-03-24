"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Menu, X, User, LogOut } from "lucide-react"
import { supabase } from "../lib/supabase"
import React from "react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<any>(null)
  const [userType, setUserType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setUser(session.user)
        getUserType(session.user.id)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        setUserType(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      setLoading(true)
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setUser(data.session.user)
        await getUserType(data.session.user.id)
      }
    } catch (error) {
      console.error("Error checking user:", error)
    } finally {
      setLoading(false)
    }
  }

  const getUserType = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("user_type").eq("id", userId).single()

      if (error) throw error

      setUserType(data.user_type)
    } catch (error) {
      console.error("Error getting user type:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
    setIsProfileMenuOpen(false)
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-[#CC7357]">WorkerConnect</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-gray-700 hover:text-[#CC7357] ${location.pathname === "/" ? "text-[#CC7357]" : ""}`}
            >
              Home
            </Link>
            <Link
              to="/search"
              className={`text-gray-700 hover:text-[#CC7357] ${location.pathname === "/search" ? "text-[#CC7357]" : ""}`}
            >
              Find Workers
            </Link>

            {/* Show different links based on user type */}
            {userType === "worker" ? (
              <Link
                to="/worker/find-jobs"
                className={`text-gray-700 hover:text-[#CC7357] ${location.pathname === "/worker/find-jobs" ? "text-[#CC7357]" : ""}`}
              >
                Find Jobs
              </Link>
            ) : (
              <Link
                to="/post-job"
                className={`text-gray-700 hover:text-[#CC7357] ${location.pathname === "/post-job" ? "text-[#CC7357]" : ""}`}
              >
                Post a Job
              </Link>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center text-gray-700 hover:text-[#CC7357]"
                >
                  <User className="h-5 w-5 mr-1" />
                  <span>Account</span>
                </button>
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                    {userType === "worker" ? (
                      <Link
                        to="/worker/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    )}
                    <Link
                      to="/profile-settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    <Link
                      to="/messages"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Messages
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347]">
                Sign In
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-[#CC7357] hover:bg-gray-100 focus:outline-none"
            >
              {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/search"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              Find Workers
            </Link>

            {/* Show different links based on user type */}
            {userType === "worker" ? (
              <Link
                to="/worker/find-jobs"
                className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Find Jobs
              </Link>
            ) : (
              <Link
                to="/post-job"
                className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                Post a Job
              </Link>
            )}

            {user ? (
              <>
                {userType === "worker" ? (
                  <Link
                    to="/worker/dashboard"
                    className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  to="/profile-settings"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile Settings
                </Link>
                <Link
                  to="/messages"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Messages
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </div>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block px-3 py-2 rounded-md bg-[#CC7357] text-white hover:bg-[#B66347]"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

