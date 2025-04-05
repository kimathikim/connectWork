"use client"

import React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { CreditCard, Calendar, Lock, CheckCircle, AlertCircle, Loader } from "lucide-react"
import { supabase } from "../lib/supabase"
import { processJobPayment, checkTransactionStatus } from "../lib/mpesa"

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

  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | "mpesa">("card")
  const [formattedWorkerPhone, setFormattedWorkerPhone] = useState("")
  const [formattedCustomerPhone, setFormattedCustomerPhone] = useState("")
  const [manualPhone, setManualPhone] = useState("")
  const [manualCustomerPhone, setManualCustomerPhone] = useState("")
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [mpesaCheckoutId, setMpesaCheckoutId] = useState<string>("")
  const [mpesaStatus, setMpesaStatus] = useState<"pending" | "completed" | "failed">("pending")
  const [mpesaPolling, setMpesaPolling] = useState(false)

  // Function to poll M-Pesa transaction status
  const pollMpesaStatus = async (checkoutRequestId: string) => {
    if (!checkoutRequestId) {
      console.error('No checkout request ID provided for polling');
      return false;
    }

    console.log(`Polling M-Pesa status for checkout ID: ${checkoutRequestId}`);

    try {
      setMpesaPolling(true);

      // Check the transaction status
      const response = await checkTransactionStatus(checkoutRequestId);
      console.log('M-Pesa status response:', response);

      if (response.success) {
        // Log the full response for debugging
        console.log('Full transaction status response:', response.data);

        // Check if we have the necessary fields in the response
        if (!response.data.CheckoutRequestID) {
          console.warn('CheckoutRequestID is missing in the response');
        }

        // Handle different response formats
        // Some M-Pesa responses might have different field names
        const resultCode = response.data.ResultCode || response.data.errorCode || null;
        const resultDesc = response.data.ResultDesc || response.data.errorMessage || 'No description provided';

        if (resultCode === null) {
          console.warn('ResultCode is missing in the response');
          console.warn('Full response data:', response.data);
          setError('Payment status check returned incomplete data. Please check your M-Pesa messages to confirm payment status.');
          return false;
        }

        // Check the result code
        if (resultCode === '0') {
          // Payment successful
          console.log('M-Pesa payment successful!');
          setMpesaStatus('completed');
          setSuccess(true);

          // Update the job status
          const { error: jobUpdateError } = await supabase
            .from("jobs")
            .update({ status: "completed", payment_status: "paid" })
            .eq("id", jobId);

          if (jobUpdateError) {
            console.error('Error updating job status:', jobUpdateError);
          } else {
            console.log(`Job ${jobId} marked as completed and paid`);
          }

          // Stop polling
          return true;
        } else if (['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010'].includes(resultCode)) {
          // Payment is still pending, continue polling
          console.log('M-Pesa payment still pending, continuing to poll...');
          return false;
        } else {
          // Payment failed
          console.error(`M-Pesa payment failed with code ${resultCode}: ${resultDesc}`);
          setMpesaStatus('failed');
          setError(`Payment failed: ${resultDesc} (Code: ${resultCode})`);

          // Stop polling
          return true;
        }
      } else {
        // Error checking status
        console.error('Error checking M-Pesa status:', response);
        setError(`Error checking payment status: ${response.message || 'Unknown error'}`);
        return false;
      }
    } catch (err: any) {
      console.error('Exception polling M-Pesa status:', err);
      setError(`Error checking payment status: ${err.message || 'Unknown error'}`);
      return false;
    } finally {
      setMpesaPolling(false);
    }
  };

  // Effect to start polling when a checkout ID is set
  useEffect(() => {
    if (!mpesaCheckoutId) {
      console.log('No checkout ID set, not starting polling');
      return;
    }

    console.log(`Starting polling for checkout ID: ${mpesaCheckoutId}`);

    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 5000; // 5 seconds
    let pollTimer: number | undefined;

    const poll = async () => {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts}`);
      const done = await pollMpesaStatus(mpesaCheckoutId);
      attempts++;

      if (!done && attempts < maxAttempts) {
        // Schedule next poll
        console.log(`Scheduling next poll in ${pollInterval}ms`);
        pollTimer = window.setTimeout(poll, pollInterval);
      } else if (attempts >= maxAttempts) {
        // Max attempts reached
        console.warn(`Max polling attempts (${maxAttempts}) reached without completion`);
        setError("Payment verification timed out. Please check your M-Pesa messages to confirm payment status.");
      } else {
        console.log('Polling completed successfully');
      }
    };

    // Start polling
    poll();

    // Cleanup function
    return () => {
      console.log('Cleaning up polling effect');
      if (pollTimer) {
        window.clearTimeout(pollTimer);
      }
      attempts = maxAttempts; // Stop polling on unmount
    };
  }, [mpesaCheckoutId]);

  useEffect(() => {
    // Verify we have all required data
    if (!jobId || !workerId || !amount) {
      setError("Missing required payment information");
      return;
    }

    // Fetch phone numbers
    const fetchPhoneNumbers = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.error("No authenticated user found");
          return;
        }

        // Get worker profile with phone number
        const { data: workerData, error: workerError } = await supabase
          .from("worker_profiles")
          .select(`
            *,
            profile:profiles!worker_profiles_id_fkey(phone)
          `)
          .eq("id", workerId)
          .single();

        if (workerError || !workerData) {
          console.error("Error fetching worker profile:", workerError);
          return;
        }

        // Get customer profile with phone number
        const { data: customerData, error: customerError } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();

        if (customerError || !customerData) {
          console.error("Error fetching customer profile:", customerError);
          return;
        }

        // Format worker phone number
        const workerPhone = workerData.profile?.phone || "";
        let formattedWorkerPhone = formatPhoneNumber(workerPhone);
        setFormattedWorkerPhone(formattedWorkerPhone);

        // Format customer phone number
        const customerPhone = customerData.phone || "";
        let formattedCustomerPhone = formatPhoneNumber(customerPhone);
        setFormattedCustomerPhone(formattedCustomerPhone);

        console.log(`Worker phone: ${formattedWorkerPhone}, Customer phone: ${formattedCustomerPhone}`);
      } catch (err) {
        console.error("Error fetching phone numbers:", err);
      }
    };

    // Helper function to format phone numbers for M-Pesa
    const formatPhoneNumber = (phone: string): string => {
      // Remove non-digit characters
      let formatted = phone.replace(/\D/g, "");

      // Remove leading country code if present (e.g., 254, +254)
      if (formatted.startsWith("254")) {
        formatted = formatted.substring(3);
      }

      // Remove leading zero if present
      if (formatted.startsWith("0")) {
        formatted = formatted.substring(1);
      }

      // Ensure it starts with a 7 or 1 (Safaricom/Airtel format)
      if (formatted.length >= 9 && (formatted.startsWith("7") || formatted.startsWith("1"))) {
        console.log(`Phone formatted for M-Pesa: ${formatted}`);
        return formatted;
      } else {
        console.warn(`Phone number is not in a valid M-Pesa format: ${formatted}`);
        return "";
      }
    };

    fetchPhoneNumbers();

    // Verify this job has an accepted application for this worker and the worker is assigned to the job
    const verifyJobWorker = async () => {
      try {
        console.log(`Verifying job ${jobId} and worker ${workerId}`);

        // First check if the job has an assigned worker
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("assigned_worker_id, status")
          .eq("id", jobId)
          .single();

        if (jobError || !jobData) {
          console.error("Job verification error:", jobError);
          setError("Invalid payment request: Job not found");
          return;
        }

        console.log(`Job data: assigned_worker_id=${jobData.assigned_worker_id}, status=${jobData.status}`);

        // Explicitly check the assigned_worker_id field in the jobs table
        if (!jobData.assigned_worker_id) {
          setError("No worker has been assigned to this job yet");
          return;
        }

        // Verify that the worker ID passed in the URL matches the assigned worker in the database
        if (jobData.assigned_worker_id !== workerId) {
          console.error(`Worker ID mismatch: Expected ${jobData.assigned_worker_id}, got ${workerId}`);
          setError("Invalid payment request: Worker is not assigned to this job");
          return;
        }

        if (jobData.status !== "in_progress") {
          setError("This job is not in progress and cannot be paid for");
          return;
        }

        // Also verify the job application status - first try to find an accepted application
        const { data: acceptedApplication, error: acceptedAppError } = await supabase
          .from("job_applications")
          .select("*")
          .eq("job_id", jobId)
          .eq("worker_id", workerId)
          .eq("status", "accepted")
          .single();

        if (acceptedAppError || !acceptedApplication) {
          console.log("No accepted application found, checking if any application exists for this worker");

          // If no accepted application is found, check if any application exists for this worker
          const { data: anyApplication, error: anyAppError } = await supabase
            .from("job_applications")
            .select("*")
            .eq("job_id", jobId)
            .eq("worker_id", workerId)
            .single();

          if (anyAppError || !anyApplication) {
            console.error("No application found for this worker:", anyAppError);
            setError("Invalid payment request: No application found for this worker");
            return;
          }

          // If an application exists but isn't accepted, try to update it to accepted
          console.log(`Found application with status: ${anyApplication.status}, attempting to update to accepted`);

          const { error: updateError } = await supabase
            .from("job_applications")
            .update({
              status: "accepted",
              updated_at: new Date().toISOString()
            })
            .eq("id", anyApplication.id);

          if (updateError) {
            console.error("Failed to update application status:", updateError);
            setError("Failed to update application status. Please try again.");
            return;
          }

          console.log("Successfully updated application status to accepted");
        }

        console.log(`Successfully verified worker assignment: Job ${jobId} is assigned to worker ${workerId}`);
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

    if (paymentMethod === "mpesa") {
      // Check if customer phone is available
      if (!formattedCustomerPhone && (!manualCustomerPhone || manualCustomerPhone.length < 9)) {
        setError("Please enter your valid M-Pesa phone number to receive the payment prompt.");
        return;
      }

      // Check if worker phone is available
      if (!formattedWorkerPhone && (!manualPhone || manualPhone.length < 9)) {
        setError("Please enter a valid M-Pesa phone number for the worker to receive the payment.");
        return;
      }
    }

    try {
      setLoading(true);

      // Check if M-Pesa credentials are configured when using M-Pesa
      if (paymentMethod === 'mpesa' &&
          (!import.meta.env.VITE_MPESA_CONSUMER_KEY ||
           !import.meta.env.VITE_MPESA_CONSUMER_SECRET ||
           !import.meta.env.VITE_MPESA_PASS_KEY)) {
        setError('M-Pesa API credentials are not configured. Please contact the administrator.');
        setLoading(false);
        return;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login", { state: { from: location.pathname } });
        return;
      }

      // Verify this job belongs to the current user and has an assigned worker
      const { data: jobData, error: jobVerifyError } = await supabase
        .from("jobs")
        .select("customer_id, status, assigned_worker_id")
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

      // Explicitly check the assigned_worker_id field in the jobs table
      if (!jobData.assigned_worker_id) {
        throw new Error("No worker has been assigned to this job yet");
      }

      // Verify that the worker ID passed in the URL matches the assigned worker in the database
      if (jobData.assigned_worker_id !== workerId) {
        console.error(`Worker ID mismatch: Expected ${jobData.assigned_worker_id}, got ${workerId}`);
        throw new Error("Invalid payment: The specified worker is not assigned to this job");
      }

      // Log successful verification
      console.log(`Successfully verified worker assignment: Job ${jobId} is assigned to worker ${workerId}`);


      // Verify again that this worker has an application for this job
      const { data: applicationData, error: applicationError } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("worker_id", workerId)
        .single();

      if (applicationError || !applicationData) {
        throw new Error("Invalid payment: No application found for this worker");
      }

      // If the application exists but isn't accepted, update it to accepted
      if (applicationData.status !== "accepted") {
        console.log(`Application found with status: ${applicationData.status}, updating to accepted`);

        const { error: updateError } = await supabase
          .from("job_applications")
          .update({
            status: "accepted",
            updated_at: new Date().toISOString()
          })
          .eq("id", applicationData.id);

        if (updateError) {
          console.error("Failed to update application status:", updateError);
          throw new Error("Failed to update application status. Please try again.");
        }

        console.log("Successfully updated application status to accepted");
      }

      // Create payment record with additional details for M-Pesa
      const paymentDetails: any = {
        job_id: jobId,
        customer_id: user.id,
        worker_id: workerId,
        amount,
        payment_method: paymentMethod,
        status: "completed",
        payment_date: new Date().toISOString(),
      };

      // Process M-Pesa payment
      if (paymentMethod === "mpesa") {
        // Use manually entered phone numbers if not available from profiles
        const customerPhoneToUse = formattedCustomerPhone || manualCustomerPhone;
        const workerPhoneToUse = formattedWorkerPhone || manualPhone;

        // Don't create a payment record yet - we'll let the M-Pesa API handle it
        // Process the M-Pesa payment
        const mpesaResponse = await processJobPayment(
          jobId || '',
          workerId || '',
          user.id,
          amount || 0,
          `+254${customerPhoneToUse}`, // Customer phone for payment prompt
          `+254${workerPhoneToUse}`    // Worker phone for receiving payment
        );

        if (!mpesaResponse.success) {
          console.error('M-Pesa payment failed:', mpesaResponse);
          throw new Error(mpesaResponse.message || "Failed to initiate M-Pesa payment");
        }

        console.log('M-Pesa payment initiated successfully:', mpesaResponse);

        // Set the checkout ID for polling
        setMpesaCheckoutId(mpesaResponse.checkoutRequestId);

        // Show a message to the user
        alert("M-Pesa payment initiated. Please check your phone to complete the payment.");

        // Set success state to show the payment processing screen
        setSuccess(true);
        setMpesaStatus("pending");

        // We'll skip the rest of the payment processing as it will be handled by the callback
        setLoading(false);
        return;
      }

      const { error: paymentError } = await supabase.from("payments").insert(paymentDetails);

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
    } catch (err: any) {
      console.error("Error processing payment:", err);

      // Provide more detailed error message
      let errorMessage = "Failed to process payment. Please try again.";

      if (err.message) {
        errorMessage = `Payment error: ${err.message}`;
      }

      // Log additional details if available
      if (err.response) {
        console.error("Error response:", err.response);
      }

      if (err.data) {
        console.error("Error data:", err.data);
      }

      setError(errorMessage);

      // If this was an M-Pesa payment, set the status to failed
      if (paymentMethod === "mpesa") {
        setMpesaStatus("failed");
        setSuccess(true); // Show the error screen
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          {paymentMethod === "mpesa" && mpesaStatus === "pending" ? (
            <>
              <Loader className="h-16 w-16 text-green-500 mx-auto mb-6 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Processing</h2>
              <p className="text-gray-600 mb-6">
                Your M-Pesa payment is being processed. Please check your phone to complete the transaction.
              </p>
              {mpesaPolling && (
                <p className="text-sm text-gray-500 mb-4">Checking payment status...</p>
              )}
            </>
          ) : paymentMethod === "mpesa" && mpesaStatus === "failed" ? (
            <>
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
              <p className="text-gray-600 mb-6">
                Your M-Pesa payment could not be processed. Please try again or choose a different payment method.
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-2">Your payment of KES {amount?.toFixed(2)} has been processed successfully.</p>
              <p className="text-gray-500 mb-6">
                {paymentMethod === "card" && "Payment was made using Credit Card"}
                {paymentMethod === "paypal" && "Payment was made using PayPal"}
                {paymentMethod === "mpesa" && (
                  <>
                    Payment was made using M-Pesa<br />
                    <div className="grid grid-cols-2 gap-2 mt-2 mb-2 text-left">
                      <div>
                        <p className="text-sm font-medium">Customer:</p>
                        <p className="text-sm">Phone: +254{formattedCustomerPhone || manualCustomerPhone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Worker:</p>
                        <p className="text-sm">{workerName}<br />Phone: +254{formattedWorkerPhone || manualPhone}</p>
                      </div>
                    </div>
                    <p className="text-sm mt-2">Transaction ID: {mpesaCheckoutId || "WC-" + Date.now().toString().substring(7)}</p>
                    <p className="text-sm mt-1 text-green-600">
                      The payment has been successfully processed and sent to the worker's M-Pesa account.
                    </p>
                  </>
                )}
              </p>
            </>
          )}
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
                <span className="font-medium">KES {amount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee:</span>
                <span className="font-medium">KES 0.00</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-900 font-medium">Total:</span>
                <span className="text-gray-900 font-medium">KES {amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
                  paymentMethod === "card" ? "bg-[#CC7357] text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("mpesa")}
                className={`py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
                  paymentMethod === "mpesa" ? "bg-[#CC7357] text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                    fill="currentColor"
                  />
                  <path
                    d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
                    fill="currentColor"
                  />
                </svg>
                <span className="text-sm">M-Pesa</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("paypal")}
                className={`py-3 px-2 rounded-lg flex items-center justify-center gap-1 ${
                  paymentMethod === "paypal" ? "bg-[#CC7357] text-white" : "bg-gray-100 text-gray-700"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                <span className="text-sm">PayPal</span>
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

            {paymentMethod === "card" && (
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
            )}

            {paymentMethod === "mpesa" && (
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-green-800 font-medium mb-2">M-Pesa Payment</h3>
                  <p className="text-green-700 text-sm mb-4">
                    You will receive a prompt on your phone to complete the payment. The funds will be sent to the worker's M-Pesa account.
                  </p>

                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <p className="text-green-700 text-sm font-medium">Customer (You):</p>
                      <p className="text-green-700 text-sm">
                        Phone: <span className="font-bold">+254{formattedCustomerPhone}</span>
                        {!formattedCustomerPhone && <span className="text-red-500 block">(No valid phone number found)</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-700 text-sm font-medium">Worker:</p>
                      <p className="text-green-700 text-sm">
                        {workerName}<br />
                        Phone: <span className="font-bold">+254{formattedWorkerPhone}</span>
                        {!formattedWorkerPhone && <span className="text-red-500 block">(No valid phone number found)</span>}
                      </p>
                    </div>
                  </div>

                  <p className="text-green-700 text-sm font-medium mt-3">
                    Amount: <span className="font-bold">KES {amount?.toFixed(2)}</span>
                  </p>
                </div>

                {!formattedCustomerPhone && (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800">
                      <p className="font-medium">Your phone number not available</p>
                      <p className="text-sm mt-1">Please enter your M-Pesa phone number to receive the payment prompt.</p>
                    </div>

                    <div>
                      <label htmlFor="manualCustomerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                        Your M-Pesa Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">+254</span>
                        <input
                          type="text"
                          id="manualCustomerPhone"
                          name="manualCustomerPhone"
                          value={manualCustomerPhone}
                          onChange={(e) => {
                            // Only allow numbers and limit to 9 digits (without the country code)
                            const value = e.target.value.replace(/\D/g, "");
                            setManualCustomerPhone(value.substring(0, 9));
                          }}
                          placeholder="7XXXXXXXX"
                          className="pl-16 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-green-500 focus:border-green-500"
                          maxLength={9}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Enter your phone number without the country code (e.g., 7XXXXXXXX)</p>
                    </div>
                  </div>
                )}

                {!formattedWorkerPhone && (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800">
                      <p className="font-medium">Worker's phone number not available</p>
                      <p className="text-sm mt-1">The worker has not provided a valid M-Pesa phone number in their profile. Please enter their M-Pesa phone number below.</p>
                    </div>

                    <div>
                      <label htmlFor="manualPhone" className="block text-sm font-medium text-gray-700 mb-1">
                        Worker's M-Pesa Phone Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">+254</span>
                        <input
                          type="text"
                          id="manualPhone"
                          name="manualPhone"
                          value={manualPhone}
                          onChange={(e) => {
                            // Only allow numbers and limit to 9 digits (without the country code)
                            const value = e.target.value.replace(/\D/g, "");
                            setManualPhone(value.substring(0, 9));
                          }}
                          placeholder="7XXXXXXXX"
                          className="pl-16 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-green-500 focus:border-green-500"
                          maxLength={9}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Enter the worker's phone number without the country code (e.g., 7XXXXXXXX)</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "paypal" && (
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
                    {paymentMethod === "card" && <span>Pay KES {amount?.toFixed(2)} with Card</span>}
                    {paymentMethod === "mpesa" && <span>Pay KES {amount?.toFixed(2)} with M-Pesa</span>}
                    {paymentMethod === "paypal" && <span>Pay KES {amount?.toFixed(2)} with PayPal</span>}
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

