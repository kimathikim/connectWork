"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { CreditCard, Calendar, Lock, CheckCircle, AlertCircle } from "lucide-react"
import { supabase } from "../lib/supabase"

interface LocationState {
  jobId?: string
  workerId?: string
  amount?: number
  jobTitle?: string
  workerName?: string
}

function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { jobId, workerId, amount, jobTitle, workerName } = (location.state as LocationState) || {}

  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card")
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Verify we have all required data
    if (!jobId || !workerId || !amount) {
      setError("Missing required payment information");
      return;
    }

    // Verify this job has an accepted application for this worker
    const verifyJobWorker = async () => {
      try {
        const { data, error } = await supabase
          .from("job_applications")
          .select("*")
          .eq("job_id", jobId)
          .eq("worker_id", workerId)
          .eq("status", "accepted")
          .single();

        if (error || !data) {
          setError("Invalid payment request: This worker is not assigned to this job");
        }
      } catch (err) {
        console.error("Error verifying job worker:", err);
        setError("Failed to verify payment information");
      }
    };

    verifyJobWorker();
  }, [jobId, workerId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    // Format card number with spaces
    if (name === "cardNumber") {
      const formatted = value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim()
      setCardDetails({ ...cardDetails, [name]: formatted.substring(0, 19) })
      return
    }

    // Format expiry date
    if (name === "expiryDate") {
      const formatted = value.replace(/\D/g, "")
      if (formatted.length <= 2) {
        setCardDetails({ ...cardDetails, [name]: formatted })
      } else {
        setCardDetails({
          ...cardDetails,
          [name]: `${formatted.substring(0, 2)}/${formatted.substring(2, 4)}`,
        })
      }
      return
    }

    // Format CVV (numbers only)
    if (name === "cvv") {
      const formatted = value.replace(/\D/g, "")
      setCardDetails({ ...cardDetails, [name]: formatted.substring(0, 3) })
      return
    }

    setCardDetails({ ...cardDetails, [name]: value })
  }

  const validateForm = () => {
    // Basic validation
    if (cardDetails.cardNumber.replace(/\s/g, "").length !== 16) {
      setError("Please enter a valid 16-digit card number")
      return false
    }

    if (!cardDetails.cardName.trim()) {
      setError("Please enter the name on your card")
      return false
    }

    if (cardDetails.expiryDate.length !== 5) {
      setError("Please enter a valid expiry date (MM/YY)")
      return false
    }

    if (cardDetails.cvv.length !== 3) {
      setError("Please enter a valid 3-digit CVV")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (paymentMethod === "card" && !validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login", { state: { from: location.pathname } });
        return;
      }

      // Verify this job belongs to the current user
      const { data: jobData, error: jobVerifyError } = await supabase
        .from("jobs")
        .select("customer_id, status")
        .eq("id", jobId)
        .single();

      if (jobVerifyError || !jobData) {
        throw new Error("Failed to verify job ownership");
      }

      if (jobData.customer_id !== user.id) {
        throw new Error("You are not authorized to make payments for this job");
      }

      if (jobData.status !== "in_progress") {
        throw new Error("This job is not in progress and cannot be paid for");
      }

      // Verify again that this worker is assigned to this job
      const { data: applicationData, error: applicationError } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("worker_id", workerId)
        .eq("status", "accepted")
        .single();

      if (applicationError || !applicationData) {
        throw new Error("Invalid payment: This worker is not assigned to this job");
      }

      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        job_id: jobId,
        customer_id: user.id,
        worker_id: workerId,
        amount,
        payment_method: paymentMethod,
        status: "completed",
        payment_date: new Date().toISOString(),
      });

      if (paymentError) throw paymentError;

      // Update job status
      const { error: jobError } = await supabase
        .from("jobs")
        .update({ status: "completed", payment_status: "paid" })
        .eq("id", jobId);

      if (jobError) throw jobError;

      // Show success message
      setSuccess(true);

      // Redirect after a delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (err) {
      console.error("Error processing payment:", err);
      setError(typeof err === "object" && err !== null && "message" in err 
        ? String(err.message) 
        : "Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">Your payment of ${amount?.toFixed(2)} has been processed successfully.</p>
          <p className="text-gray-500 mb-6">You will be redirected to your dashboard shortly.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (error && (!jobId || !workerId || !amount)) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Payment Request</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-[#CC7357] text-white px-6 py-2 rounded-md hover:bg-[#B66347] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Payment</h1>
            <p className="text-gray-600">Complete your payment to finalize the job</p>
          </div>

          {/* Payment Summary */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Job:</span>
                <span className="font-medium">{jobTitle || "Service"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Worker:</span>
                <span className="font-medium">{workerName || "Service Provider"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">${amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee:</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-900 font-medium">Total:</span>
                <span className="text-gray-900 font-medium">${amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setPaymentMethod("card")}
                className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 ${
                  paymentMethod === "card" ? "bg-[#CC7357] text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                <CreditCard className="h-5 w-5" />
                Credit Card
              </button>
              <button
                onClick={() => setPaymentMethod("paypal")}
                className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 ${
                  paymentMethod === "paypal" ? "bg-[#CC7357] text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M19.5 8.5H4.5C3.4 8.5 2.5 9.4 2.5 10.5V17.5C2.5 18.6 3.4 19.5 4.5 19.5H19.5C20.6 19.5 21.5 18.6 21.5 17.5V10.5C21.5 9.4 20.6 8.5 19.5 8.5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16.5 19.5V6.5C16.5 5.4 15.6 4.5 14.5 4.5H9.5C8.4 4.5 7.5 5.4 7.5 6.5V19.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                PayPal
              </button>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {paymentMethod === "card" ? (
              <>
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      id="cardNumber"
                      name="cardNumber"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardDetails.cardNumber}
                      onChange={handleInputChange}
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                      maxLength={19}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name on Card
                  </label>
                  <input
                    id="cardName"
                    name="cardName"
                    type="text"
                    placeholder="John Doe"
                    value={cardDetails.cardName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        id="expiryDate"
                        name="expiryDate"
                        type="text"
                        placeholder="MM/YY"
                        value={cardDetails.expiryDate}
                        onChange={handleInputChange}
                        className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        id="cvv"
                        name="cvv"
                        type="text"
                        placeholder="123"
                        value={cardDetails.cvv}
                        onChange={handleInputChange}
                        className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#CC7357] focus:border-[#CC7357]"
                        maxLength={3}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">You will be redirected to PayPal to complete your payment.</p>
                <svg
                  className="h-12 w-auto mx-auto"
                  viewBox="0 0 124 33"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M46.211 6.749H41.169L37.694 25.115H42.736L46.211 6.749Z" fill="#253B80" />
                  <path
                    d="M26.532 6.749L22.238 20.345L21.055 14.225L21.055 14.224L19.144 8.481C19.144 8.481 18.991 6.749 16.935 6.749H8.737L8.637 7.091C8.637 7.091 10.824 7.455 13.391 9.494L17.664 25.113H22.922L29.951 6.749H26.532Z"
                    fill="#253B80"
                  />
                  <path
                    d="M53.817 17.471C53.817 20.288 51.735 22.57 48.647 22.57C47.255 22.57 46.123 22.142 45.41 21.303L45.391 21.323L46.897 25.115H42.162L38.687 6.75H43.425L44.272 11.471C44.88 10.382 46.19 9.762 47.777 9.762C50.866 9.762 53.817 12.043 53.817 17.471Z"
                    fill="#253B80"
                  />
                  <path d="M78.429 6.749H73.388L69.913 25.115H74.955L78.429 6.749Z" fill="#179BD7" />
                  <path
                    d="M58.752 6.749L54.458 20.345L53.275 14.225V14.224L51.364 8.481C51.364 8.481 51.211 6.749 49.155 6.749H40.957L40.857 7.091C40.857 7.091 43.044 7.455 45.611 9.494L49.884 25.113H55.142L62.171 6.749H58.752Z"
                    fill="#179BD7"
                  />
                  <path
                    d="M86.039 17.471C86.039 20.288 83.956 22.57 80.868 22.57C79.477 22.57 78.345 22.142 77.632 21.303L77.613 21.323L79.119 25.115H74.384L70.909 6.75H75.647L76.494 11.471C77.102 10.382 78.412 9.762 79.999 9.762C83.088 9.762 86.039 12.043 86.039 17.471Z"
                    fill="#179BD7"
                  />
                  <path
                    d="M95.088 22.113C95.088 22.113 94.49 22.57 93.327 22.57C92.164 22.57 91.389 21.874 91.389 20.762C91.389 19.65 91.926 18.537 94.252 18.537H95.088V22.113ZM99.137 16.058C99.137 12.332 96.585 9.762 92.462 9.762C88.339 9.762 85.787 12.332 85.787 16.058C85.787 19.784 88.339 22.354 92.462 22.354C94.788 22.354 96.488 21.658 97.651 20.546L95.325 18.08C94.788 18.776 93.863 19.111 92.7 19.111C91.05 19.111 90.037 18.08 90.037 16.968H99.137C99.137 16.633 99.137 16.393 99.137 16.058Z"
                    fill="#179BD7"
                  />
                  <path
                    d="M106.404 13.592C106.404 12.48 107.329 11.784 108.492 11.784C109.179 11.784 109.893 12.001 110.429 12.48L112.042 9.545C110.906 8.889 109.417 8.65 108.015 8.65C104.606 8.65 102.042 10.897 102.042 13.832C102.042 18.776 108.73 17.664 108.73 19.888C108.73 21 107.567 21.696 106.166 21.696C104.765 21.696 103.602 21 102.828 20.306L101.215 23.241C102.589 24.353 104.467 25.049 106.166 25.049C109.655 25.049 113.064 22.802 113.064 19.888C113.064 14.704 106.404 15.816 106.404 13.592Z"
                    fill="#179BD7"
                  />
                  <path d="M119.295 9.762L115.886 25.115H120.22L123.629 9.762H119.295Z" fill="#179BD7" />
                  <path
                    d="M116.422 6.749C116.422 8.193 117.585 9.305 119.057 9.305C120.529 9.305 121.692 8.193 121.692 6.749C121.692 5.305 120.529 4.193 119.057 4.193C117.585 4.193 116.422 5.305 116.422 6.749Z"
                    fill="#253B80"
                  />
                </svg>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-[#CC7357] hover:bg-[#B66347] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#CC7357] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5" />
                    <span>Pay ${amount?.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-1">
              <Lock className="h-3 w-3" />
              Your payment information is secure and encrypted
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PaymentPage

