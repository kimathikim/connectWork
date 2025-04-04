"use client"

import { Link } from "react-router-dom"

function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create an Account</h1>
            <p className="mt-2 text-gray-600">Join WorkerConnect to find skilled workers or get hired</p>
          </div>

          {/* We'll implement the form directly here until we fix the imports */}
          <form className="space-y-6">
            {/* User Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to:</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 p-4 border rounded-md border-[#CC7357] bg-[#FFF8F6] text-[#CC7357]"
                >
                  <span>Hire Workers</span>
                </button>

                <button
                  type="button"
                  className="flex items-center justify-center gap-2 p-4 border rounded-md border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <span>Find Work</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                placeholder="••••••••"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Password must be at least 6 characters</p>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#CC7357] hover:bg-[#B66347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC7357]"
              >
                Create Account
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-[#CC7357] hover:text-[#B66347] font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage

