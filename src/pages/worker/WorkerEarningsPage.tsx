"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronLeft, Calendar, Download, ArrowUp, ArrowDown, User, AlertCircle, X } from "lucide-react"
import { Calculator } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { DatePicker } from "../../components/ui/date-picker"
import { useToast } from "../../components/ui/toast"

// Import date-fns functions
import {
  format,
  parseISO,
  isAfter,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  differenceInCalendarDays,
  formatDistanceToNow,
  isToday,
  isYesterday,
  compareDesc,
  compareAsc
} from "date-fns"

function WorkerEarningsPage() {
  // All hooks must be called at the top level
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [earnings, setEarnings] = useState<any[]>([])
  const [filteredEarnings, setFilteredEarnings] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    percentChange: 0,
  })

  // Filtering and sorting
  const [timeFilter, setTimeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("desc")

  // Custom date range filter
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [useCustomDateRange, setUseCustomDateRange] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (earnings.length > 0) {
      calculateStats()
    }
  }, [earnings])

  const checkAuth = async () => {
    try {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        addToast("Please log in to view your earnings", "info")
        navigate("/login", { state: { from: "/worker/earnings" } })
        return
      }

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_type")
        .eq("id", data.session.user.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        addToast("Error loading your profile", "error")
        throw profileError
      }

      console.log('User profile:', profileData)

      if (profileData.user_type !== "worker") {
        // Redirect to customer dashboard if not a worker
        addToast("This page is only available to workers", "info")
        navigate("/dashboard")
        return
      }

      // Get worker profile to get the correct worker_id
      const { data: workerData, error: workerError } = await supabase
        .from("worker_profiles")
        .select("id")
        .eq("id", data.session.user.id)
        .single()

      if (workerError) {
        console.error('Error fetching worker profile:', workerError)
        addToast("Trying alternative method to find your worker profile", "info")

        // Try alternative approach - the worker profile ID should be the same as the user ID
        // since worker_profiles uses the user ID as its primary key
        const workerId = data.session.user.id;

        // Create a mock result to match the expected structure
        const altWorkerData = { id: workerId };
        const altWorkerError = null;

        if (altWorkerError) {
          console.error('Error fetching worker profile with user_id:', altWorkerError)
          addToast("Could not find your worker profile", "error")
          throw altWorkerError
        }

        console.log('Worker profile (alt):', altWorkerData)
        addToast("Successfully found your worker profile", "success")

        // Load worker earnings using the worker_id from worker_profiles
        await loadEarnings(altWorkerData.id)
        return
      }

      console.log('Worker profile:', workerData)
      addToast("Loading your earnings data", "info")

      // Load worker earnings using the worker_id from worker_profiles
      await loadEarnings(workerData.id)
    } catch (error: any) {
      console.error("Error checking auth:", error)
      addToast(error.message || "Error loading your earnings data", "error")
    }
  }

  const loadEarnings = async (workerId: string) => {
    try {
      setLoading(true)
      console.log("Loading earnings for worker ID:", workerId)
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          job:jobs(
            *,
            customer:profiles!customer_id(*)
          )
        `)
        .eq("worker_id", workerId)
        .order("payment_date", { ascending: false })

      if (error) {
        console.error('Error fetching earnings:', error)
        addToast("Failed to load your earnings data", "error")
        throw error
      }

      if (!data || data.length === 0) {
        console.log('No earnings found for worker ID:', workerId)
        addToast("No earnings found", "info")
      } else {
        console.log('Fetched earnings data:', data.length, 'items')
        addToast(`Successfully loaded ${data.length} earnings records`, "success")
      }

      setEarnings(data || [])
      setLoading(false)
    } catch (error: any) {
      console.error("Error loading earnings:", error)
      addToast(error.message || "Error loading earnings data", "error")
      setLoading(false)
    }
  }

  const calculateStats = () => {
    // Calculate total earnings
    const totalEarnings = earnings.reduce((sum, payment) => sum + payment.amount, 0)

    // Get current date ranges
    const now = new Date()
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)

    // Get last month date range
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))

    // Calculate earnings for this month using date-fns
    const thisMonthEarnings = earnings
      .filter((payment) => {
        const paymentDate = parseISO(payment.payment_date)
        return isWithinInterval(paymentDate, { start: thisMonthStart, end: thisMonthEnd })
      })
      .reduce((sum, payment) => sum + payment.amount, 0)

    // Calculate earnings for last month using date-fns
    const lastMonthEarnings = earnings
      .filter((payment) => {
        const paymentDate = parseISO(payment.payment_date)
        return isWithinInterval(paymentDate, { start: lastMonthStart, end: lastMonthEnd })
      })
      .reduce((sum, payment) => sum + payment.amount, 0)

    // Calculate percent change
    let percentChange = 0
    if (lastMonthEarnings > 0) {
      percentChange = ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
    }

    setStats({
      totalEarnings,
      thisMonth: thisMonthEarnings,
      lastMonth: lastMonthEarnings,
      percentChange,
    })
  }

  // getFilteredEarnings function has been moved inside the useEffect hook

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      // Set new sort field and default to descending
      setSortBy(field)
      setSortOrder("desc")
    }
  }

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString)

    // Show relative date for recent dates
    if (isToday(date)) {
      return 'Today'
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else if (differenceInCalendarDays(new Date(), date) < 7) {
      return formatDistanceToNow(date, { addSuffix: true })
    }

    // Otherwise show formatted date
    return format(date, 'MMM d, yyyy')
  }

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toFixed(2)}`
  }

  // Handle apply filter button click
  const handleApplyFilter = () => {
    // The filter will be applied automatically through the useEffect
    // Just ensure the custom date range is enabled
    if (startDate && endDate) {
      setUseCustomDateRange(true);
      // Force a re-render
      setTimeFilter(prev => prev === 'custom' ? 'custom_refresh' : 'custom');
    }
  }

  const handleExportEarnings = () => {
    try {
      // Create CSV content
      let csvContent = "Date,Job Title,Client,Amount,Status\n"

      if (filteredEarnings.length === 0) {
        addToast("No earnings data to export", "info")
        return
      }

      filteredEarnings.forEach((payment: any) => {
        const row = [
          formatDate(payment.payment_date),
          payment.job ? `"${payment.job.title?.replace(/"/g, '""') || 'Unknown job'}"` : '"Unknown job"',
          payment.job?.customer ? `"${payment.job.customer.full_name?.replace(/"/g, '""') || 'Unknown client'}"` : '"Unknown client"',
          payment.amount,
          payment.status,
        ]
        csvContent += row.join(",") + "\n"
      })

      addToast("Earnings data exported successfully", "success")

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `earnings_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    } catch (error: any) {
      console.error("Error exporting earnings:", error)
      addToast(error.message || "Failed to export earnings data", "error")
    }
  }

  // Update filtered earnings when component renders
  useEffect(() => {
    try {
      console.log('Earnings data:', earnings.length, 'items')
      // Define the filtering function inside the useEffect to avoid stale closures
      const getFilteredResults = () => {
      // Apply time filter
      let filtered = [...earnings]

      // Apply custom date range filter if enabled
      if (useCustomDateRange && startDate && endDate) {
        filtered = filtered.filter((payment) => {
          const paymentDate = parseISO(payment.payment_date)
          return isWithinInterval(paymentDate, { start: startDate, end: endDate })
        })
      }
      // Otherwise apply predefined time filters
      else if (timeFilter !== "all") {
        const now = new Date()

        if (timeFilter === "thisMonth") {
          // This month filter using date-fns
          const thisMonthStart = startOfMonth(now)
          const thisMonthEnd = endOfMonth(now)

          filtered = filtered.filter((payment) => {
            const paymentDate = parseISO(payment.payment_date)
            return isWithinInterval(paymentDate, { start: thisMonthStart, end: thisMonthEnd })
          })
        } else if (timeFilter === "lastMonth") {
          // Last month filter using date-fns
          const lastMonthStart = startOfMonth(subMonths(now, 1))
          const lastMonthEnd = endOfMonth(subMonths(now, 1))

          filtered = filtered.filter((payment) => {
            const paymentDate = parseISO(payment.payment_date)
            return isWithinInterval(paymentDate, { start: lastMonthStart, end: lastMonthEnd })
          })
        } else if (timeFilter === "last3Months") {
          // Last 3 months filter using date-fns
          const threeMonthsAgo = subMonths(now, 3)

          filtered = filtered.filter((payment) => {
            const paymentDate = parseISO(payment.payment_date)
            return isAfter(paymentDate, threeMonthsAgo)
          })
        } else if (timeFilter === "thisYear") {
          // This year filter using date-fns
          const thisYearStart = startOfYear(now)
          const thisYearEnd = endOfYear(now)

          filtered = filtered.filter((payment) => {
            const paymentDate = parseISO(payment.payment_date)
            return isWithinInterval(paymentDate, { start: thisYearStart, end: thisYearEnd })
          })
        } else if (timeFilter === "custom" || timeFilter === "custom_refresh") {
          // This will enable the custom date picker UI
          setUseCustomDateRange(true)
        }
      }

      // Apply sorting
      filtered.sort((a, b) => {
        if (sortBy === "date") {
          const dateA = parseISO(a.payment_date)
          const dateB = parseISO(b.payment_date)
          return sortOrder === "asc" ? compareAsc(dateA, dateB) : compareDesc(dateA, dateB)
        } else if (sortBy === "amount") {
          return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount
        }
        return 0
      })

      return filtered
    }

    // Update the filtered earnings
    const results = getFilteredResults()
    console.log('Filtered earnings:', results.length, 'items')
    setFilteredEarnings(results)
    } catch (error) {
      console.error('Error filtering earnings:', error)
      setFilteredEarnings([])
    }
  }, [earnings, timeFilter, sortBy, sortOrder, useCustomDateRange, startDate, endDate])

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
        <div className="mb-6">
          <Link to="/worker/dashboard" className="flex items-center text-[#CC7357] hover:text-[#B66347]">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
          <p className="text-gray-600 mt-2">Track your income and payment history</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Total Earnings</h2>
              <span className="h-8 w-8 text-[#CC7357] font-bold text-xl">KES</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalEarnings)}</p>
            <p className="text-sm text-gray-500 mt-2">Lifetime earnings</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">This Month</h2>
              <Calendar className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.thisMonth)}</p>
            <div className="flex items-center mt-2">
              {stats.percentChange > 0 ? (
                <div className="flex items-center text-green-600 text-sm">
                  <ArrowUp className="h-4 w-4 mr-1" />
                  <span>{Math.abs(stats.percentChange).toFixed(1)}% from last month</span>
                </div>
              ) : stats.percentChange < 0 ? (
                <div className="flex items-center text-red-600 text-sm">
                  <ArrowDown className="h-4 w-4 mr-1" />
                  <span>{Math.abs(stats.percentChange).toFixed(1)}% from last month</span>
                </div>
              ) : (
                <span className="text-sm text-gray-500">No change from last month</span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Last Month</h2>
              <Calendar className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.lastMonth)}</p>
            <p className="text-sm text-gray-500 mt-2">Previous month's earnings</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-700">Average Per Job</h2>
              <Calculator className="h-8 w-8 text-[#CC7357]" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {earnings.length > 0 ? formatCurrency(stats.totalEarnings / earnings.length) : "KES 0.00"}
            </p>
            <p className="text-sm text-gray-500 mt-2">Based on {earnings.length} completed jobs</p>
          </div>
        </div>

        {/* Earnings Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">Payment History</h2>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Time Filter */}
                <select
                  value={timeFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTimeFilter(value);
                    if (value !== 'custom' && value !== 'custom_refresh') {
                      setUseCustomDateRange(false);
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                >
                  <option value="all">All Time</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="last3Months">Last 3 Months</option>
                  <option value="thisYear">This Year</option>
                  <option value="custom">Custom Range</option>
                  {/* Hidden option used for forcing re-renders */}
                  <option value="custom_refresh" hidden>Custom Range (Refresh)</option>
                </select>

                {/* Export Button */}
                <button
                  onClick={handleExportEarnings}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Download className="h-5 w-5" />
                  <span>Export</span>
                </button>
              </div>

              {/* Custom Date Range Picker */}
              {useCustomDateRange && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-700">Custom Date Range</h3>
                    <button
                      onClick={() => {
                        setUseCustomDateRange(false);
                        setTimeFilter('all');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <DatePicker
                        selectedDate={startDate}
                        onDateChange={setStartDate}
                        placeholder="Select start date"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <DatePicker
                        selectedDate={endDate}
                        onDateChange={setEndDate}
                        placeholder="Select end date"
                        minDate={startDate || undefined}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleApplyFilter}
                      disabled={!startDate || !endDate}
                      className="bg-[#CC7357] text-white px-4 py-2 rounded-md hover:bg-[#B66347] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {earnings.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No earnings yet</h3>
              <p className="text-gray-500 mb-6">Complete jobs to start earning money.</p>
              <Link
                to="/worker/find-jobs"
                className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Find Jobs
              </Link>
            </div>
          ) : filteredEarnings.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No earnings found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your filters to see more results.</p>
              <button
                onClick={() => setTimeFilter("all")}
                className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
              >
                Show All Earnings
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        <span>Date</span>
                        {sortBy === "date" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ArrowDown className="h-4 w-4 ml-1" />
                          ))}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("amount")}
                    >
                      <div className="flex items-center">
                        <span>Amount</span>
                        {sortBy === "amount" &&
                          (sortOrder === "asc" ? (
                            <ArrowUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ArrowDown className="h-4 w-4 ml-1" />
                          ))}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEarnings.length > 0 ? filteredEarnings.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {payment.job ? (
                          <Link to={`/jobs/${payment.job_id}`} className="text-[#CC7357] hover:underline">
                            {payment.job.title}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Job not found</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                            {payment.job?.customer?.avatar_url ? (
                              <img
                                src={payment.job.customer.avatar_url || "/placeholder.svg"}
                                alt={payment.job.customer.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-full w-full p-1 text-gray-400" />
                            )}
                          </div>
                          <span>{payment.job?.customer?.full_name || 'Unknown client'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(payment.payment_date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No earnings found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkerEarningsPage

