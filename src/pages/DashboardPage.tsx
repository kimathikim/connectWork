import { Link, useNavigate } from "react-router-dom"
import {
  Briefcase,
  Clock,
  CheckCircle,
  User,
  MessageSquare,
  Star,
  DollarSign,
  ChevronRight,
  Search,
  Calendar,
  Edit,
  MapPin,
} from "lucide-react"
import { supabase, getCustomerAppointments } from "../lib/supabase"
import { checkUserAuth } from '../lib/auth-helpers';
import { StartConversationButton } from "../components/StartConversationButton";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "../components/ui/toast";

function DashboardPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const currentUser = user // Store current user for comparison
  const [profile, setProfile] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "all">("active")
  const [filteredJobs, setFilteredJobs] = useState<any[]>([])
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([])
  const [stats, setStats] = useState({
    activeJobs: 0,
    completedJobs: 0,
    totalSpent: 0,
  })

  // Use React Query to fetch jobs asynchronously
  const {
    data: jobs = [],
    isLoading: isJobsLoading,
    error: jobsError,
    refetch: refetchJobs
  } = useQuery({
    queryKey: ['customerJobs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select(`
            *,
            service:services(*),
            applications:job_applications(
              *,
              worker:worker_profiles(
                *,
                profile:profiles!worker_profiles_id_fkey(*)
              )
            ),
            assigned_worker:worker_profiles!jobs_assigned_worker_id_fkey(
              *,
              profile:profiles!worker_profiles_id_fkey(*)
            ),
            payments:payments(*),
            reviews:reviews(*)
          `)
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error loading jobs:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });

  // Use React Query to fetch appointments asynchronously
  const {
    data: appointments = [],
    isLoading: isAppointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments
  } = useQuery({
    queryKey: ['customerAppointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        return await getCustomerAppointments(user.id);
      } catch (error) {
        console.error("Error loading appointments:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false
  });

  // Initialize page and authenticate user
  useEffect(() => {
    // Only run once on component mount
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run only once

  const initializePage = async () => {
    try {
      setLoading(true);

      const { authenticated, user, authorized } = await checkUserAuth(
        navigate,
        'customer',
        '/dashboard'
      );

      if (!authenticated || !authorized) return;

      // Only set user if it's different from current user
      if (JSON.stringify(user) !== JSON.stringify(currentUser)) {
        setUser(user);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      addToast('Error loading dashboard. Please try again.', 'error');
      setLoading(false);
    }
  };

  // Show error toasts when queries fail
  useEffect(() => {
    if (jobsError) {
      console.error('Error loading jobs:', jobsError);
      addToast('Failed to load your jobs. Please try again.', 'error');
    }
  }, [jobsError, addToast]);

  useEffect(() => {
    if (appointmentsError) {
      console.error('Error loading appointments:', appointmentsError);
      addToast('Failed to load your appointments. Please try again.', 'error');
    }
  }, [appointmentsError, addToast]);

  // Removed memoized filter functions as they're now directly implemented in the useEffect

  // Filter jobs and appointments when data or tab changes
  useEffect(() => {
    if (jobs.length > 0) {
      // Filter jobs directly here instead of calling the function
      let filtered = [...jobs];

      if (activeTab === "active") {
        filtered = jobs.filter((job: { status: string }) => job.status !== "completed");
      } else if (activeTab === "completed") {
        filtered = jobs.filter((job: { status: string }) => job.status === "completed");
      }

      setFilteredJobs(filtered);
    }

    if (appointments.length > 0) {
      // Filter appointments directly here instead of calling the function
      let filtered = [...appointments];

      if (activeTab === "active") {
        filtered = appointments.filter((appointment: { status: string }) =>
          appointment.status !== "completed" && appointment.status !== "cancelled");
      } else if (activeTab === "completed") {
        filtered = appointments.filter((appointment: { status: string }) =>
          appointment.status === "completed");
      }

      setFilteredAppointments(filtered);
    }
  }, [jobs, appointments, activeTab])

  // Calculate stats when jobs data changes
  useEffect(() => {
    if (jobs.length > 0) {
      // Calculate stats
      const activeJobs = jobs.filter((job) => job.status !== "completed").length
      const completedJobs = jobs.filter((job) => job.status === "completed").length

      // Calculate total spent
      const totalSpent = jobs.reduce((sum, job) => {
        const payment = job.payments && job.payments[0]
        return sum + (payment ? payment.amount : 0)
      }, 0)

      setStats({
        activeJobs,
        completedJobs,
        totalSpent,
      })
    }
  }, [jobs])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Open</span>
      case "in_progress":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>
        )
      case "completed":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  const getApplicationsCount = (job: any) => {
    return job.applications ? job.applications.length : 0
  }

  const getAcceptedWorker = (job: any) => {
    // First check if there's an assigned worker directly on the job using assigned_worker_id
    if (job.assigned_worker_id && job.assigned_worker && job.assigned_worker.profile) {
      return {
        id: job.assigned_worker_id,
        ...job.assigned_worker,
        profile: job.assigned_worker.profile,
        rating: job.assigned_worker.avg_rating,
        review_count: 0 // This could be added to the worker_profiles table
      };
    }

    // Fallback to checking applications
    if (!job.applications) return null;

    const acceptedApplication = job.applications.find((app: any) => app.status === "accepted");
    if (!acceptedApplication || !acceptedApplication.worker) return null;

    return {
      id: acceptedApplication.worker_id,
      ...acceptedApplication.worker,
      profile: acceptedApplication.worker.profile
    };
  }

  const needsReview = (job: any) => {
    return (
      job.status === "completed" &&
      (!job.reviews || job.reviews.length === 0)
    );
  }

  // updateJobStatus function removed as status changes should be handled automatically

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
          <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your jobs and worker applications</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Active Jobs</h2>
              <Briefcase className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.activeJobs}</p>
            <Link to="/post-job" className="text-sm text-[#CC7357] hover:underline mt-2 inline-block">
              Post a new job
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Completed Jobs</h2>
              <CheckCircle className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completedJobs}</p>
            <button
              onClick={() => setActiveTab("completed")}
              className="text-sm text-[#CC7357] hover:underline mt-2 inline-block"
            >
              View history
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Total Spent</h2>
              <span className="h-8 w-8 text-[#CC7357] font-bold text-xl">KES</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">KES {stats.totalSpent.toFixed(2)}</p>
            <span className="text-sm text-gray-500 mt-2 inline-block">Across {stats.completedJobs} completed jobs</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Jobs List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Your Jobs</h2>
                  <Link to="/post-job" className="text-sm text-[#CC7357] hover:underline">
                    Post a new job
                  </Link>
                </div>

                {/* Tabs */}
                <div className="mt-4 border-b border-gray-200">
                  <nav className="flex -mb-px">
                    <button
                      onClick={() => setActiveTab("active")}
                      className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${activeTab === "active"
                          ? "border-[#CC7357] text-[#CC7357]"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                      Active Jobs
                    </button>
                    <button
                      onClick={() => setActiveTab("completed")}
                      className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${activeTab === "completed"
                          ? "border-[#CC7357] text-[#CC7357]"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                      Completed
                    </button>
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${activeTab === "all"
                          ? "border-[#CC7357] text-[#CC7357]"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                      All Jobs
                    </button>
                  </nav>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {isJobsLoading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CC7357] mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your jobs...</p>
                  </div>
                ) : jobsError ? (
                  <div className="p-6 text-center">
                    <div className="text-red-500 text-xl mb-2">⚠️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading jobs</h3>
                    <p className="text-gray-500 mb-4">We couldn't load your jobs. Please try again.</p>
                    <button
                      onClick={() => refetchJobs()}
                      className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="p-6 text-center">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
                    <p className="text-gray-500 mb-6">
                      {activeTab === "active"
                        ? "You don't have any active jobs. Post a new job to get started."
                        : activeTab === "completed"
                          ? "You don't have any completed jobs yet."
                          : "You haven't posted any jobs yet."}
                    </p>
                    <Link
                      to="/post-job"
                      className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
                    >
                      Post a Job
                    </Link>
                  </div>
                ) : (
                  filteredJobs.map((job: {
                    id: string;
                    title: string;
                    status: string;
                    created_at: string;
                    budget_min: number;
                    budget_max: number;
                    service?: { name: string };
                    applications?: any[];
                    assigned_worker_id?: string;
                    assigned_worker?: any;
                    reviewed?: boolean;
                  }) => {
                    const acceptedWorker = getAcceptedWorker(job)

                    return (
                      <div key={job.id} className="p-6 hover:bg-gray-50">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                              {getStatusBadge(job.status)}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                              <div className="flex items-center text-gray-500 text-sm">
                                <Calendar className="h-4 w-4 mr-1" />
                                <span>Posted on {formatDate(job.created_at)}</span>
                              </div>

                              <div className="flex items-center text-gray-500 text-sm">
                                <span className="text-xs font-bold mr-1">KES</span>
                                <span>
                                  {job.budget_min === job.budget_max
                                    ? `${job.budget_min}`
                                    : `${job.budget_min} - ${job.budget_max}`}
                                </span>
                              </div>

                              {job.service && (
                                <div className="flex items-center text-gray-500 text-sm">
                                  <Briefcase className="h-4 w-4 mr-1" />
                                  <span>{job.service.name}</span>
                                </div>
                              )}
                            </div>

                            {job.status === "open" && (
                              <div className="mt-3 flex items-center text-sm">
                                <Clock className="h-4 w-4 text-[#CC7357] mr-1" />
                                <span>
                                  {getApplicationsCount(job)} application{getApplicationsCount(job) !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}

                            {acceptedWorker && (
                              <div className="mt-3 flex items-center">
                                <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                                  {acceptedWorker.profile.avatar_url ? (
                                    <img
                                      src={acceptedWorker.profile.avatar_url || "/placeholder.svg"}
                                      alt={acceptedWorker.profile.full_name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-full w-full p-1 text-gray-400" />
                                  )}
                                </div>
                                <div>
                                  <span className="text-sm text-gray-700 font-medium">
                                    {acceptedWorker.profile.full_name}
                                  </span>
                                  <div className="flex items-center">
                                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                    <span className="text-xs text-gray-500 ml-1">
                                      {acceptedWorker.rating || "0"} ({acceptedWorker.review_count || "0"} reviews)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] transition-colors text-center"
                            >
                              View Details
                            </Link>

                            {job.status === "open" && getApplicationsCount(job) > 0 && (
                              <Link
                                to={`/job-applications/${job.id}`}
                                className="border border-[#CC7357] text-[#CC7357] px-4 py-2 rounded-md hover:bg-[#FFF8F6] transition-colors text-center"
                              >
                                View Applications
                              </Link>
                            )}

                            {acceptedWorker && (
                              <Link
                                to={`/messages?user=${acceptedWorker.id}`}
                                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-center"
                              >
                                Message Worker
                              </Link>
                            )}

                            {job.status === "in_progress" && (
                              <Link
                                to={`/payment`}
                                state={{
                                  jobId: job.id,
                                  workerId: job.assigned_worker_id || acceptedWorker?.id,
                                  // Use the price from the accepted application instead of budget_min
                                  amount: job.applications?.find((app: any) => app.status === "accepted")?.price || job.budget_min,
                                  jobTitle: job.title,
                                  workerName: acceptedWorker?.profile?.full_name || "Worker",
                                }}
                                className="border border-green-500 text-green-600 px-4 py-2 rounded-md hover:bg-green-50 transition-colors text-center"
                                onClick={(e) => {
                                  // Prevent navigation if no assigned worker
                                  if (!job.assigned_worker_id) {
                                    e.preventDefault();
                                    alert("No worker has been assigned to this job yet.");
                                    return;
                                  }

                                  // Double-check that we have the worker information
                                  if (!acceptedWorker) {
                                    e.preventDefault();
                                    alert("Worker information is missing. Please refresh the page and try again.");
                                  }
                                }}
                              >
                                Complete & Pay
                              </Link>
                            )}

                            {job.status === "completed" && needsReview(job) && (
                              <Link
                                to={`/review/${job.id}`}
                                className="border border-yellow-500 text-yellow-600 px-4 py-2 rounded-md hover:bg-yellow-50 transition-colors text-center"
                              >
                                Leave Review
                              </Link>
                            )}

                            {/* Status display - no manual updates */}
                            {job.status !== "completed" && (
                              <div className="mt-2">
                                <div className="text-sm text-gray-500">
                                  Current Status: {getStatusBadge(job.status)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Appointments */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Your Appointments</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {filteredAppointments.length === 0 ? (
                  <div className="p-6 text-center">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                    <p className="text-gray-500 mb-6">
                      {activeTab === "active"
                        ? "You don't have any upcoming appointments."
                        : activeTab === "completed"
                          ? "You don't have any completed appointments yet."
                          : "You haven't scheduled any appointments yet."}
                    </p>
                    <Link
                      to="/search"
                      className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
                    >
                      Find Workers
                    </Link>
                  </div>
                ) : (
                  filteredAppointments.map((appointment: any) => (
                    <div key={appointment.id} className="p-6 hover:bg-gray-50">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-gray-900">{appointment.title || 'Appointment'}</h3>
                            {getStatusBadge(appointment.status)}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                            <div className="flex items-center text-gray-500 text-sm">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{formatDate(appointment.appointment_date)}</span>
                            </div>

                            <div className="flex items-center text-gray-500 text-sm">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{appointment.start_time} - {appointment.end_time}</span>
                            </div>

                            {appointment.worker && (
                              <div className="flex items-center text-gray-500 text-sm">
                                <User className="h-4 w-4 mr-1" />
                                <span>Worker: {appointment.worker.profile?.full_name || 'Worker'}</span>
                              </div>
                            )}
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

                          {appointment.worker && (
                            <Link
                              to={`/messages?user=${appointment.worker.id}`}
                              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors text-center"
                            >
                              Message Worker
                            </Link>
                          )}

                          {appointment.status === 'scheduled' && (
                            <button
                              className="border border-red-500 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
                              onClick={() => {
                                if (confirm('Are you sure you want to cancel this appointment?')) {
                                  // TODO: Implement cancel appointment functionality
                                  alert('Appointment cancellation will be implemented soon.');
                                }
                              }}
                            >
                              Cancel
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
                <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || user?.email?.split('@')[0] || "Customer"}</h2>
                <p className="text-gray-500">{profile?.email || user?.email || "No email available"}</p>
                <p className="text-gray-500">{profile?.location || "No location set"}</p>

                <div className="mt-6">
                  <Link
                    to="/profile-settings"
                    className="flex items-center justify-center gap-2 text-[#CC7357] hover:text-[#B66347]"
                  >
                    Edit Profile
                  </Link>
                  <Link
                    to={`/customer-profile/${profile?.id}`}
                    className="flex items-center justify-center gap-2 text-[#CC7357] hover:text-[#B66347]"
                  >
                    View Public Profile
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
                <Link to="/post-job" className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <Briefcase className="h-5 w-5 text-[#CC7357] mr-3" />
                    <span>Post a New Job</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
                <Link to="/search" className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <Search className="h-5 w-5 text-[#CC7357] mr-3" />
                    <span>Find Workers</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
                <Link to="/workers-map" className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-[#CC7357] mr-3" />
                    <span>Workers Map</span>
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

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {jobs.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No recent activity</div>
                ) : (
                  jobs.slice(0, 3).map((job: any) => (
                    <div key={job.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-[#FFF8F6] p-2 rounded-full">
                          {job.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-[#CC7357]" />
                          ) : job.status === "in_progress" ? (
                            <Clock className="h-5 w-5 text-[#CC7357]" />
                          ) : (
                            <Briefcase className="h-5 w-5 text-[#CC7357]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{job.title}</p>
                          <p className="text-xs text-gray-500">
                            {job.status === "completed"
                              ? "Job completed"
                              : job.status === "in_progress"
                                ? "Job in progress"
                                : `${getApplicationsCount(job)} applications received`}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(job.created_at)}</p>
                        </div>
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

export default DashboardPage


