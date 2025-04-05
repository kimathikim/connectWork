"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Briefcase,
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
import { getWorkerJobs, getWorkerEarnings, getWorkerAppointments } from "../../lib/supabase"
import { Database } from "../../types/supabase";
import { useToast } from "../../components/ui/toast"
import { ensureWorkerProfile } from "../../lib/worker-profile-utils";
import { useQuery } from "@tanstack/react-query";

type Profile = Database['public']['Tables']['profiles']['Row'];

function WorkerDashboardPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({
    activeJobs: 0,
    pendingApplications: 0,
    completedJobs: 0,
    totalEarnings: 0,
    averageRating: 0,
  })
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  
  // Use React Query for data fetching with caching
  const {
    data: jobs = [],
    isLoading: isJobsLoading,
    error: jobsError,
  } = useQuery<any[]>({
    queryKey: ['workerJobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return getWorkerJobs(user.id);
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });
  
  // Calculate job stats when jobs data changes
  useEffect(() => {
    if (jobs && jobs.length > 0) {
      // Calculate stats
      const activeJobs = jobs.filter(
        (job: any) => job.status === "accepted" && job.job.status !== "completed",
      ).length

      const pendingApplications = jobs.filter((job: any) => job.status === "pending").length

      const completedJobs = jobs.filter((job: any) => job.job.status === "completed").length

      setStats((prev) => ({
        ...prev,
        activeJobs,
        pendingApplications,
        completedJobs,
      }))
    }
  }, [jobs]);
  
  const {
    data: earnings = [],
    isLoading: isEarningsLoading,
    error: earningsError,
  } = useQuery<any[]>({
    queryKey: ['workerEarnings', workerProfile?.id],
    queryFn: async () => {
      if (!workerProfile?.id) return [];
      return getWorkerEarnings(workerProfile.id);
    },
    enabled: !!workerProfile?.id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });
  
  // Calculate earnings stats when earnings data changes
  useEffect(() => {
    if (earnings && earnings.length > 0) {
      // Calculate total earnings
      const totalEarnings = earnings.reduce((sum: number, payment: any) => sum + payment.amount, 0)

      // Calculate average rating if available
      let averageRating = 0;
      if (workerProfile && workerProfile.avg_rating) {
        averageRating = workerProfile.avg_rating;
      }

      setStats((prev) => ({
        ...prev,
        totalEarnings,
        averageRating
      }))
    }
  }, [earnings, workerProfile]);
  
  const {
    data: appointments = [],
    isLoading: isAppointmentsLoading,
    error: appointmentsError,
  } = useQuery<any[]>({
    queryKey: ['workerAppointments', workerProfile?.id],
    queryFn: async () => {
      if (!workerProfile?.id) return [];
      return getWorkerAppointments(workerProfile.id);
    },
    enabled: !!workerProfile?.id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });

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

      // Get worker profile data
      const workerData = await fetchWorkerProfile(user.id)
      
      // Set worker profile - this will trigger the React Query hooks
      if (workerData) {
        setWorkerProfile(workerData)
        addToast("Dashboard data loading...", "info")
      } else {
        addToast("Some data may not be available", "info")
      }

      setLoading(false)
    } catch (error: any) {
      console.error('Error loading dashboard:', error)
      addToast(error.message || "Failed to load dashboard data", "error")
      setLoading(false)
    }
  }

  const fetchWorkerProfile = async (userId: string) => {
    try {
      const workerProfile = await ensureWorkerProfile(userId);
      setWorkerProfile(workerProfile);
      return workerProfile;
    } catch (error: any) {
      console.error("Error fetching worker profile:", error);
      addToast(error.message || "Failed to load worker profile", "error");
      return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Show error toasts when queries fail
  useEffect(() => {
    if (jobsError) {
      console.error('Error loading jobs:', jobsError);
      addToast('Failed to load your jobs. Please try again.', 'error');
    }
  }, [jobsError, addToast]);

  useEffect(() => {
    if (earningsError) {
      console.error('Error loading earnings:', earningsError);
      addToast('Failed to load your earnings. Please try again.', 'error');
    }
  }, [earningsError, addToast]);

  useEffect(() => {
    if (appointmentsError) {
      console.error('Error loading appointments:', appointmentsError);
      addToast('Failed to load your appointments. Please try again.', 'error');
    }
  }, [appointmentsError, addToast]);

  // Only show full page loading when initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
        <p className="ml-3 text-gray-700">Initializing dashboard...</p>
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
        {isEarningsLoading ? (
          <div className="mb-8">
            <div className="p-6 text-center bg-white rounded-lg shadow-md">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC7357] mx-auto mb-4"></div>
              <p className="text-gray-500">Loading your stats...</p>
            </div>
          </div>
        ) : (
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
                <span className="h-8 w-8 text-[#CC7357] font-bold text-xl">KES</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">KES {stats.totalEarnings.toFixed(2)}</p>
              <Link to="/worker/earnings" className="text-sm text-[#CC7357] hover:underline mt-2 inline-block">
                View earnings
              </Link>
            </div>
          </div>
        )}

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
                {isJobsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC7357] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your jobs...</p>
                  </div>
                ) : jobs.length === 0 ? (
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

            {/* Appointments */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Your Appointments</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {isAppointmentsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC7357] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your appointments...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                    <p className="text-gray-500 mb-6">
                      You don't have any scheduled appointments yet.
                    </p>
                  </div>
                ) : (
                  appointments.map((appointment: any) => (
                    <div key={appointment.id} className="p-6 hover:bg-gray-50">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">{appointment.service?.name || 'Appointment'}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                            <div className="flex items-center text-gray-500 text-sm">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{formatDate(appointment.date)}</span>
                            </div>

                            <div className="flex items-center text-gray-500 text-sm">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{appointment.time}</span>
                            </div>

                            <div className="flex items-center text-gray-500 text-sm">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{appointment.address}</span>
                            </div>
                          </div>

                          {appointment.notes && (
                            <p className="mt-2 text-gray-600">{appointment.notes}</p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2">
                          <Link
                            to={`/appointments/${appointment.id}`}
                            className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors text-center"
                          >
                            View Details
                          </Link>

                          {appointment.customer && (
                            <Link
                              to={`/messages?user=${appointment.customer.id}`}
                              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-center"
                            >
                              Message Customer
                            </Link>
                          )}

                          {appointment.status === 'scheduled' && (
                            <button
                              className="border border-green-500 text-green-600 px-4 py-2 rounded-md hover:bg-green-50 transition-colors"
                              onClick={() => {
                                // TODO: Implement complete appointment functionality
                                alert('Appointment completion will be implemented soon.');
                              }}
                            >
                              Complete
                            </button>
                          )}
                        </div>
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
                <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || user?.email?.split('@')[0] || "Professional"}</h2>
                <p className="text-gray-500">{profile?.email || user?.email || "No email available"}</p>
                <p className="text-[#6B8E23] font-medium">{workerProfile?.headline || "Professional Worker"}</p>

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
                {isEarningsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC7357] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your earnings...</p>
                  </div>
                ) : earnings.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-gray-500">No earnings yet.</p>
                    <p className="text-sm text-gray-400 mt-1">Complete jobs to start earning.</p>
                  </div>
                ) : (
                  earnings.slice(0, 3).map((payment: any) => (
                    <div key={payment.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {payment.job ? payment.job.title : 'Payment'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">{formatDate(payment.payment_date)}</p>
                        </div>
                        <span className="font-bold text-gray-900">KES {payment.amount.toFixed(2)}</span>
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
