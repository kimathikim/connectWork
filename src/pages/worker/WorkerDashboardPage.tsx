"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Briefcase,
  DollarSign,
  Star,
  Clock,
  Calendar,
  User,
  Settings,
  ChevronRight,
  CheckCircle,
  MapPin,
  PenToolIcon as Tool,
  MessageSquare,
} from "lucide-react"
import { checkUserAuth, getUserProfile } from "../../lib/auth-helpers"
import { getWorkerJobs, getWorkerEarnings, supabase } from "../../lib/supabase"
import { Database } from "../../types/supabase";
type Profile = Database['public']['Tables']['profiles']['Row'];

function WorkerDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [earnings, setEarnings] = useState<any[]>([])
  const [stats, setStats] = useState({
    activeJobs: 0,
    pendingApplications: 0,
    completedJobs: 0,
    totalEarnings: 0,
    averageRating: 0,
  })
  const [workerProfile, setWorkerProfile] = useState<any>(null);

  const fetchWorkerProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("worker_profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      setWorkerProfile(data);
    } catch (err) {
      console.error("Error fetching worker profile:", err);
    }
  };

  useEffect(() => {
    initializePage()
  }, [])

  const initializePage = async () => {
    try {
      setLoading(true)
      
      const { authenticated, user, authorized } = await checkUserAuth(
        navigate, 
        'worker', 
        '/worker/dashboard'
      )
      
      if (!authenticated || !authorized) return
      
      setUser(user)
      
      // Get full profile data
      const userProfile = await getUserProfile(user.id)
      setProfile(userProfile)
      
      // Load worker data
      await Promise.all([loadJobs(user.id), loadEarnings(user.id)])
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setLoading(false)
    }
  }

  const loadJobs = async (userId: string) => {
    try {
      const workerJobs = await getWorkerJobs(userId)
      setJobs(workerJobs || [])

      // Calculate stats
      const activeJobs = workerJobs.filter(
        (job: any) => job.status === "accepted" && job.job.status !== "completed",
      ).length

      const pendingApplications = workerJobs.filter((job: any) => job.status === "pending").length

      const completedJobs = workerJobs.filter((job: any) => job.job.status === "completed").length

      setStats((prev) => ({
        ...prev,
        activeJobs,
        pendingApplications,
        completedJobs,
      }))
    } catch (error) {
      console.error("Error loading jobs:", error)
    }
  }

  const loadEarnings = async (userId: string) => {
    try {
      const workerEarnings = await getWorkerEarnings(userId)
      setEarnings(workerEarnings || [])

      // Calculate total earnings
      const totalEarnings = workerEarnings.reduce((sum: number, payment: any) => sum + payment.amount, 0)

      setStats((prev) => ({
        ...prev,
        totalEarnings,
      }))
    } catch (error) {
      console.error("Error loading earnings:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Worker Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your jobs, applications, and earnings</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Active Jobs</h2>
              <Briefcase className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeJobs}</p>
            <Link to="/worker/jobs" className="text-sm text-[#CC7357] hover:underline mt-2 inline-block">
              View all jobs
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Pending Applications</h2>
              <Clock className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.pendingApplications}</p>
            <Link to="/worker/applications" className="text-sm text-[#CC7357] hover:underline mt-2 inline-block">
              View applications
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Completed Jobs</h2>
              <CheckCircle className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completedJobs}</p>
            <Link
              to="/worker/jobs?status=completed"
              className="text-sm text-[#CC7357] hover:underline mt-2 inline-block"
            >
              View history
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Total Earnings</h2>
              <DollarSign className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">${stats.totalEarnings.toFixed(2)}</p>
            <Link to="/worker/earnings" className="text-sm text-[#CC7357] hover:underline mt-2 inline-block">
              View earnings
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Jobs */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Recent Jobs</h2>
                <Link to="/worker/jobs" className="text-sm text-[#CC7357] hover:underline">
                  View all
                </Link>
              </div>

              <div className="divide-y divide-gray-200">
                {jobs.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">You don't have any jobs yet.</p>
                    <Link to="/worker/find-jobs" className="mt-2 inline-block text-[#CC7357] hover:underline">
                      Browse available jobs
                    </Link>
                  </div>
                ) : (
                  jobs.slice(0, 5).map((application: any) => (
                    <div key={application.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{application.job.title}</h3>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>{formatDate(application.created_at)}</span>
                            <span className="mx-2">•</span>
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{application.job.location}</span>
                          </div>
                        </div>
                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              application.status === "accepted"
                                ? "bg-green-100 text-green-800"
                                : application.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                            {application.job.customer.avatar_url ? (
                              <img
                                src={application.job.customer.avatar_url || "/placeholder.svg"}
                                alt={application.job.customer.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-full w-full p-1 text-gray-400" />
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{application.job.customer.full_name}</span>
                        </div>
                        <Link
                          to={`/jobs/${application.job_id}`}
                          className="text-sm text-[#CC7357] hover:underline flex items-center"
                        >
                          View details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 text-center">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-200 mx-auto mb-4">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url || "/placeholder.svg"}
                      alt={profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-full w-full p-4 text-gray-400" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || "Worker Name"}</h2>
                <p className="text-[#6B8E23] font-medium">{workerProfile?.profession || "Professional Worker"}</p>

                <div className="mt-4 flex justify-center">
                  <div className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="ml-1 text-gray-700">{stats.averageRating.toFixed(1)} Rating</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    to="/profile-settings"
                    className="flex items-center justify-center gap-2 text-[#CC7357] hover:text-[#B66347]"
                  >
                    <Settings className="h-5 w-5" />
                    Edit Profile
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
              </div>
              <div className="divide-y divide-gray-200">
                <Link to="/worker/find-jobs" className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <Briefcase className="h-5 w-5 text-[#CC7357] mr-3" />
                    <span>Find New Jobs</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
                <Link to="/worker/services" className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <Tool className="h-5 w-5 text-[#CC7357] mr-3" />
                    <span>Manage Services</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
                <Link to="/worker/availability" className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-[#CC7357] mr-3" />
                    <span>Set Availability</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
                <Link to="/messages" className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-[#CC7357] mr-3" />
                    <span>Messages</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Recent Earnings */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Recent Earnings</h2>
                <Link to="/worker/earnings" className="text-sm text-[#CC7357] hover:underline">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-gray-200">
                {earnings.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No earnings yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Complete jobs to start earning.</p>
                  </div>
                ) : (
                  earnings.slice(0, 3).map((payment: any) => (
                    <div key={payment.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">{payment.job.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{formatDate(payment.payment_date)}</p>
                        </div>
                        <span className="font-bold text-gray-900">${payment.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkerDashboardPage

