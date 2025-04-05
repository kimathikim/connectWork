import React, { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Menu, X, User, Bell, LogOut } from "lucide-react"
import { supabase } from "../lib/supabase"
import { useToast } from "./ui/toast"

export function WorkerHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [isMenuOpen, setIsMenuOpen] = useState({
    mobile: false,
    profile: false
  })
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      try {
        // Get auth user
        const { data, error } = await supabase.auth.getUser()
        if (error) {
          console.error("Error fetching user:", error)
          return
        }

        setUser(data.user)

        // Get profile data
        if (data.user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single()

          if (profileError) {
            console.error("Error fetching profile:", profileError)
          } else {
            setProfile(profileData)
          }
        }
      } catch (err) {
        console.error("Error in getUser:", err)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  useEffect(() => {
    // Fetch notifications for the worker
    const fetchNotifications = async () => {
      if (!user) return

      try {
        // Check if notifications table exists first
        const { error: checkError } = await supabase
          .from('notifications')
          .select('count(*)', { count: 'exact', head: true })
          .limit(1);

        if (checkError) {
          console.log('Notifications table may not exist yet:', checkError.message);
          // Set empty notifications to avoid errors
          setNotifications([]);
          return;
        }

        // If table exists, fetch notifications
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error fetching notifications:", error);
          return;
        }

        setNotifications(data || []);
      } catch (err) {
        console.error("Error in notifications process:", err);
        // Set empty notifications as fallback
        setNotifications([]);
      }
    };

    fetchNotifications();
  }, [user])

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      addToast("Signed out successfully", "success")
      navigate("/login")
    } catch (error: any) {
      console.error("Error signing out:", error)
      addToast(error.message || "Error signing out", "error")
    }
  }

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/worker/dashboard"
              className="flex-shrink-0 flex items-center"
            >
              <span className="text-2xl font-bold text-[#CC7357]">WorkerConnect Pro</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/worker/dashboard"
              className={`text-gray-700 hover:text-[#CC7357] ${
                location.pathname === "/worker/dashboard" ? "text-[#CC7357]" : ""
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/worker/jobs"
              className={`text-gray-700 hover:text-[#CC7357] ${
                location.pathname === "/worker/jobs" ? "text-[#CC7357]" : ""
              }`}
            >
              My Jobs
            </Link>
            <Link
              to="/jobs/find"
              className={`text-gray-700 hover:text-[#CC7357] ${
                location.pathname === "/jobs/find" ? "text-[#CC7357]" : ""
              }`}
            >
              Find Jobs
            </Link>
            <Link
              to="/worker/messages"
              className={`text-gray-700 hover:text-[#CC7357] ${
                location.pathname === "/worker/messages" ? "text-[#CC7357]" : ""
              }`}
            >
              Messages
            </Link>
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <div className="relative">
                  <Link to="/worker/notifications" className="text-gray-700 hover:text-[#CC7357]">
                    <Bell className="h-6 w-6" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </Link>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(prev => ({ ...prev, profile: !prev.profile }))}
                    className="flex items-center space-x-2 focus:outline-none"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt={user.user_metadata?.full_name || "Worker Profile"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <span className="text-gray-700">
                      {profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || "Worker"}
                    </span>
                  </button>
                  {isMenuOpen.profile && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile Settings
                    </Link>
                    <Link
                      to="/worker/earnings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Earnings
                    </Link>
                    <Link
                      to="/worker/availability"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Availability
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-[#CC7357]"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: !prev.mobile }))}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-[#CC7357] hover:bg-gray-100 focus:outline-none"
            >
              {isMenuOpen.mobile ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen.mobile && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/worker/dashboard"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
            >
              Dashboard
            </Link>
            <Link
              to="/worker/jobs"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
            >
              My Jobs
            </Link>
            <Link
              to="/jobs/find"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
            >
              Find Jobs
            </Link>
            <Link
              to="/worker/messages"
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
            >
              Messages
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <div className="px-2 space-y-1">
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
                >
                  Profile Settings
                </Link>
                <Link
                  to="/worker/earnings"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
                >
                  Earnings
                </Link>
                <Link
                  to="/worker/availability"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
                >
                  Availability
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(prev => ({ ...prev, mobile: false }));
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="px-2 space-y-1">
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsMenuOpen(prev => ({ ...prev, mobile: false }))}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}


