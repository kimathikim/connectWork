import { useLocation, Link } from "react-router-dom"
import { CheckCircle, Calendar, Clock, MapPin } from "lucide-react"

import React from "react"
interface LocationState {
  job?: {
    id: string
    title: string
  }
  worker?: {
    name: string
    profession: string
  }
  appointmentDate?: string
  appointmentTime?: string
}

function BookingSuccessPage() {
  const location = useLocation()
  const { job, worker, appointmentDate, appointmentTime } = (location.state as LocationState) || {}

  if (!job || !worker) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Invalid Access</h2>
          <p className="text-gray-600 mb-6">This page should only be accessed after completing a booking.</p>
          <Link to="/" className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  // Format date if available
  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : "Date to be confirmed"

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Successful!</h1>
          <p className="text-gray-600 mb-6">Your booking with {worker.name} has been confirmed.</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-bold text-gray-900 mb-3">{job.title}</h2>

            <div className="space-y-2 text-left">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-2" />
                <span>{formattedDate}</span>
              </div>

              {appointmentTime && (
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-2" />
                  <span>{appointmentTime}</span>
                </div>
              )}

              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-2" />
                <span>{worker.profession}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <Link
              to="/dashboard"
              className="bg-[#CC7357] text-white px-6 py-3 rounded-md hover:bg-[#B66347] transition-colors"
            >
              Go to Dashboard
            </Link>

            <Link to="/" className="text-[#CC7357] hover:text-[#B66347]">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookingSuccessPage

