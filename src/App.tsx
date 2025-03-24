import { Routes, Route } from "react-router-dom"
import { Header } from "./components/Header"
import HomePage from "./pages/HomePage"
import SearchPage from "./pages/SearchPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import PostJobPage from "./pages/PostJobPage"
import WorkerProfilePage from "./pages/WorkerProfilePage"
import DashboardPage from "./pages/DashboardPage"
import BookingPage from "./pages/BookingPage"
import BookingSuccessPage from "./pages/BookingSuccessPage"
import ProfileSettingsPage from "./pages/ProfileSettingsPage"
import JobDetailsPage from "./pages/JobDetailsPage"
import MessagingPage from "./pages/MessagingPage"
import ReviewsPage from "./pages/ReviewsPage"
import PaymentPage from "./pages/PaymentPage"
import CustomerProfilePage from "./pages/CustomerProfilePage"
import JobApplicationsPage from "./pages/JobApplicationsPage"

// Worker-specific pages
import WorkerDashboardPage from "./pages/worker/WorkerDashboardPage"
import FindJobsPage from "./pages/worker/FindJobsPage"
import WorkerJobsPage from "./pages/worker/WorkerJobsPage"
import WorkerServicesPage from "./pages/worker/WorkerServicesPage"
import WorkerAvailabilityPage from "./pages/worker/WorkerAvailabilityPage"
import WorkerEarningsPage from "./pages/worker/WorkerEarningsPage"

// Auth Guard
import AuthGuard from "./components/AuthGuard"
import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import JobApplicationPage from "./pages/JobApplicationPage"
import ReviewPage from "./pages/ReviewPage"

function App() {
  const [dbInitialized, setDbInitialized] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        // Check if profiles table exists and has data
        const { data, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.error("Database error:", error)
          setDbError(`Database error: ${error.message}. Code: ${error.code}`)
          return
        }
        
        // Check if other essential tables exist
        const tables = ['worker_profiles', 'services', 'jobs', 'job_applications'];
        for (const table of tables) {
          const { error: tableError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (tableError) {
            console.error(`Error checking ${table}:`, tableError);
            setDbError(`Table '${table}' may not be initialized. Error: ${tableError.message}`);
            return;
          }
        }
        
        setDbInitialized(true)
      } catch (error) {
        console.error("Database check failed:", error)
        setDbError(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    checkDatabase()
  }, [])

  if (dbError) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Database Error</h1>
          <p className="mb-4">{dbError}</p>
          <p className="text-sm text-gray-600">
            Please ensure your Supabase instance is properly configured and migrations have been applied.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Header />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="/reviews/:workerId" element={<ReviewsPage />} />

        {/* Protected Routes - Any authenticated user */}
        <Route
          path="/profile-settings"
          element={
            <AuthGuard>
              <ProfileSettingsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/messages"
          element={
            <AuthGuard>
              <MessagingPage />
            </AuthGuard>
          }
        />

        {/* Customer Routes */}
        <Route
          path="/post-job"
          element={
            <AuthGuard requiredUserType="customer">
              <PostJobPage />
            </AuthGuard>
          }
        />
        <Route
          path="/review/:jobId"
          element={
            <AuthGuard requiredUserType="customer">
              <ReviewPage />
            </AuthGuard>
          }
        />
        <Route
          path="/job-applications/:jobId"
          element={
            <AuthGuard requiredUserType="customer">
              <JobApplicationsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/worker-profile/:workerId"
          element={
            <AuthGuard requiredUserType="customer">
              <WorkerProfilePage />
            </AuthGuard>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthGuard requiredUserType="customer">
              <DashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/booking"
          element={
            <AuthGuard requiredUserType="customer">
              <BookingPage />
            </AuthGuard>
          }
        />
        <Route
          path="/booking-success"
          element={
            <AuthGuard requiredUserType="customer">
              <BookingSuccessPage />
            </AuthGuard>
          }
        />
        <Route
          path="/payment"
          element={
            <AuthGuard requiredUserType="customer">
              <PaymentPage />
            </AuthGuard>
          }
        />
        <Route
          path="/customer-profile/:customerId"
          element={<CustomerProfilePage />}
        />

        {/* Worker Routes */}
        <Route
          path="/worker/dashboard"
          element={
            <AuthGuard requiredUserType="worker">
              <WorkerDashboardPage />
            </AuthGuard>
          }
        />
        <Route
          path="/worker/find-jobs"
          element={
            <AuthGuard requiredUserType="worker">
              <FindJobsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/worker/jobs"
          element={
            <AuthGuard requiredUserType="worker">
              <WorkerJobsPage />
            </AuthGuard>
          }
        />
        <Route
          path="/worker/services"
          element={
            <AuthGuard requiredUserType="worker">
              <WorkerServicesPage />
            </AuthGuard>
          }
        />
        <Route
          path="/worker/availability"
          element={
            <AuthGuard requiredUserType="worker">
              <WorkerAvailabilityPage />
            </AuthGuard>
          }
        />
        <Route
          path="/worker/earnings"
          element={
            <AuthGuard requiredUserType="worker">
              <WorkerEarningsPage />
            </AuthGuard>
          }
        />
        <Route path="/apply/:jobId" element={<JobApplicationPage />} />
      </Routes>
    </div>
  )
}

export default App

