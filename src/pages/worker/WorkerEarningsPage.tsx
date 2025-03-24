"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { DollarSign, ChevronLeft, Calendar, Download, ArrowUp, ArrowDown, User } from "lucide-react"
import { Calculator } from "lucide-react"
import { supabase } from "../../lib/supabase"
import React from "react"

function WorkerEarningsPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [earnings, setEarnings] = useState<any[]>([])
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
        navigate("/login", { state: { from: "/worker/earnings" } })
        return
      }

      setUser(data.session.user)

      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", data.session.user.id)
        .single()

      if (profileError) throw profileError

      if (profileData.user_type !== "worker") {
        // Redirect to customer dashboard if not a worker
        navigate("/dashboard")
        return
      }

      // Load worker earnings
      await loadEarnings(data.session.user.id)

      setLoading(false)
    } catch (error) {
      console.error("Error checking auth:", error)
      setLoading(false)
    }
  }

  const loadEarnings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          job:jobs(
            *,
            customer:profiles!customer_id(*)
          )
        `)
        .eq("worker_id", userId)
        .order("payment_date", { ascending: false })

      if (error) throw error

      setEarnings(data || [])
    } catch (error) {
      console.error("Error loading earnings:", error)
    }
  }

  const calculateStats = () => {
    // Calculate total earnings
    const totalEarnings = earnings.reduce((sum, payment) => sum + payment.amount, 0)

    // Get current date
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Calculate earnings for this month
    const thisMonthEarnings = earnings
      .filter((payment) => {
        const paymentDate = new Date(payment.payment_date)
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
      })
      .reduce((sum, payment) => sum + payment.amount, 0)

    // Calculate earnings for last month
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
    const lastMonth = lastMonthDate.getMonth()
    const lastMonthYear = lastMonthDate.getFullYear()

    const lastMonthEarnings = earnings
      .filter((payment) => {
        const paymentDate = new Date(payment.payment_date)
        return paymentDate.getMonth() === lastMonth && paymentDate.getFullYear() === lastMonthYear
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

  const getFilteredEarnings = () => {
    // Apply time filter
    let filtered = [...earnings]

    if (timeFilter !== "all") {
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      if (timeFilter === "thisMonth") {
        filtered = filtered.filter((payment) => {
          const paymentDate = new Date(payment.payment_date)
          return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear
        })
      } else if (timeFilter === "lastMonth") {
        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
        const lastMonth = lastMonthDate.getMonth()
        const lastMonthYear = lastMonthDate.getFullYear()

        filtered = filtered.filter((payment) => {
          const paymentDate = new Date(payment.payment_date)
          return paymentDate.getMonth() === lastMonth && paymentDate.getFullYear() === lastMonthYear
        })
      } else if (timeFilter === "last3Months") {
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        filtered = filtered.filter((payment) => {
          const paymentDate = new Date(payment.payment_date)
          return paymentDate >= threeMonthsAgo
        })
      } else if (timeFilter === "thisYear") {
        filtered = filtered.filter((payment) => {
          const paymentDate = new Date(payment.payment_date)
          return paymentDate.getFullYear() === currentYear
        })
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.payment_date).getTime()
        const dateB = new Date(b.payment_date).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      } else if (sortBy === "amount") {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount
      }
      return 0
    })

    return filtered
  }

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
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const handleExportEarnings = () => {
    // Get filtered earnings
    const filteredEarnings = getFilteredEarnings()

    // Create CSV content
    let csvContent = "Date,Job Title,Client,Amount,Status\n"

    filteredEarnings.forEach((payment) => {
      const row = [
        formatDate(payment.payment_date),
        `"${payment.job.title.replace(/"/g, '""')}"`,
        `"${payment.job.customer.full_name.replace(/"/g, '""')}"`,
        payment.amount,
        payment.status,
      ]
      csvContent += row.join(",") + "\n"
    })

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `earnings_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#CC7357]"></div>
      </div>
    )
  }

  const filteredEarnings = getFilteredEarnings()

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
              <DollarSign className="h-8 w-8 text-[#CC7357]" />
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
              {earnings.length > 0 ? formatCurrency(stats.totalEarnings / earnings.length) : "$0.00"}
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
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                >
                  <option value="all">All Time</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="last3Months">Last 3 Months</option>
                  <option value="thisYear">This Year</option>
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
            </div>
          </div>

          {earnings.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                  {filteredEarnings.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/jobs/${payment.job_id}`} className="text-[#CC7357] hover:underline">
                          {payment.job.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                            {payment.job.customer.avatar_url ? (
                              <img
                                src={payment.job.customer.avatar_url || "/placeholder.svg"}
                                alt={payment.job.customer.full_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-full w-full p-1 text-gray-400" />
                            )}
                          </div>
                          <span>{payment.job.customer.full_name}</span>
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
                  ))}
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

