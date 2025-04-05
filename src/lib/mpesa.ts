import { supabase } from './supabase';
import { callMpesaApi } from './api';

// M-Pesa API configuration
interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passKey: string;
  shortCode: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

// Check if environment variables are properly loaded
const checkMpesaEnv = () => {
  const envVars = {
    VITE_MPESA_CONSUMER_KEY: import.meta.env.VITE_MPESA_CONSUMER_KEY,
    VITE_MPESA_CONSUMER_SECRET: import.meta.env.VITE_MPESA_CONSUMER_SECRET,
    VITE_MPESA_PASS_KEY: import.meta.env.VITE_MPESA_PASS_KEY,
    VITE_MPESA_SHORT_CODE: import.meta.env.VITE_MPESA_SHORT_CODE,
    VITE_MPESA_CALLBACK_URL: import.meta.env.VITE_MPESA_CALLBACK_URL,
    VITE_MPESA_ENVIRONMENT: import.meta.env.VITE_MPESA_ENVIRONMENT
  };

  console.log('M-Pesa Environment Variables:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`${key}: ${value ? (key.includes('KEY') || key.includes('SECRET') || key.includes('PASS') ? '***' : value) : 'undefined'}`);
  });

  const missingVars = Object.entries(envVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.warn('Missing environment variables:', missingVars.join(', '));
    return false;
  }

  return true;
};

// Check environment variables
const envLoaded = checkMpesaEnv();
if (!envLoaded) {
  console.error('M-Pesa environment variables are not properly configured!');
  console.error('Please check your .env file and ensure all required variables are set.');
  console.error('Required variables: VITE_MPESA_CONSUMER_KEY, VITE_MPESA_CONSUMER_SECRET, VITE_MPESA_PASS_KEY');
}

// Default to sandbox environment for development
const MPESA_CONFIG: MpesaConfig = {
  consumerKey: import.meta.env.VITE_MPESA_CONSUMER_KEY || '',
  consumerSecret: import.meta.env.VITE_MPESA_CONSUMER_SECRET || '',
  passKey: import.meta.env.VITE_MPESA_PASS_KEY || '',
  shortCode: import.meta.env.VITE_MPESA_SHORT_CODE || '174379',
  callbackUrl: import.meta.env.VITE_MPESA_CALLBACK_URL || 'https://connectwork.vercel.app/api/mpesa/callback',
  environment: (import.meta.env.VITE_MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
};

// Log the configuration (without sensitive data)
console.log('M-Pesa Configuration:', {
  shortCode: MPESA_CONFIG.shortCode,
  callbackUrl: MPESA_CONFIG.callbackUrl,
  environment: MPESA_CONFIG.environment,
  hasConsumerKey: !!MPESA_CONFIG.consumerKey,
  hasConsumerSecret: !!MPESA_CONFIG.consumerSecret,
  hasPassKey: !!MPESA_CONFIG.passKey
});

// Base URL is handled by the API module

// Base64 encoding function for browser compatibility
const encodeBase64 = (str: string): string => {
  try {
    // Handle non-ASCII characters by encoding to UTF-8 first
    const bytes = new TextEncoder().encode(str);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64;
  } catch (error) {
    console.error('Error encoding to base64:', error);
    // Fallback to simple btoa for ASCII strings
    return btoa(str);
  }
};

// Generate the authorization token
const getAuthToken = async (): Promise<string> => {
  try {
    // Check if credentials are available
    if (!MPESA_CONFIG.consumerKey || !MPESA_CONFIG.consumerSecret) {
      console.error('M-Pesa credentials are missing!');
      throw new Error('M-Pesa API credentials (Consumer Key and Secret) are not configured. Please check your .env file.');
    }

    // Create the authorization header
    const auth = encodeBase64(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`);

    console.log('Getting M-Pesa auth token...');

    // Make the direct API call
    const result = await callMpesaApi(
      '/oauth/v1/generate?grant_type=client_credentials',
      'GET',
      null,
      {
        'Authorization': `Basic ${auth}`
      }
    );

    if (!result.success) {
      console.error('Failed to get auth token:', result);
      throw new Error(`Failed to get auth token: ${result.message || 'Unknown error'}`);
    }

    if (!result.data || !result.data.access_token) {
      console.error('Auth token response is missing access_token:', result);
      throw new Error('Invalid auth token response: access_token is missing');
    }

    console.log('Auth token received successfully');
    return result.data.access_token;
  } catch (error) {
    console.error('Error getting M-Pesa auth token:', error);
    throw error;
  }
};

// Format the timestamp for M-Pesa API
const getTimestamp = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
};

// Generate the password for the STK Push
const getPassword = (timestamp: string): string => {
  const dataToEncode = `${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passKey}${timestamp}`;
  return encodeBase64(dataToEncode);
};

// Interface for STK Push request
interface StkPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl?: string;
}

// Interface for STK Push response
interface StkPushResponse {
  success: boolean;
  message: string;
  data?: any;
  checkoutRequestId?: string;
  error?: any; // Add error property for detailed error information
}

// Initiate STK Push to customer's phone
export const initiateStkPush = async (
  request: StkPushRequest
): Promise<StkPushResponse> => {
  console.log(`Initiating STK Push: Phone=${request.phoneNumber}, Amount=${request.amount}`);
  console.log(`Reference: ${request.accountReference}, Description: ${request.transactionDesc}`);

  try {
    // Validate the phone number format
    let phoneNumber = request.phoneNumber.replace(/\D/g, '');

    // Add country code if not present
    if (!phoneNumber.startsWith('254')) {
      // Remove leading zero if present
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      phoneNumber = `254${phoneNumber}`;
    }

    // Ensure the phone number is valid
    if (phoneNumber.length !== 12 || !phoneNumber.startsWith('254')) {
      return {
        success: false,
        message: 'Invalid phone number format. Must be a valid Kenyan phone number.',
      };
    }

    // Get the auth token
    const token = await getAuthToken();

    // Get the timestamp
    const timestamp = getTimestamp();

    // Get the password
    const password = getPassword(timestamp);

    // Prepare the request body
    const body = {
      BusinessShortCode: MPESA_CONFIG.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(request.amount), // M-Pesa only accepts integers
      PartyA: phoneNumber,
      PartyB: MPESA_CONFIG.shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: request.callbackUrl || MPESA_CONFIG.callbackUrl,
      AccountReference: request.accountReference || 'WorkConnect Payment',
      TransactionDesc: request.transactionDesc || 'Payment for services',
    };

    // Make the direct API call to M-Pesa
    console.log('Initiating real STK Push to M-Pesa API');
    const result = await callMpesaApi(
      '/mpesa/stkpush/v1/processrequest',
      'POST',
      body,
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    );

    if (!result.success) {
      console.error('M-Pesa STK Push error:', result);
      return {
        success: false,
        message: `Failed to initiate payment: ${result.message || 'Unknown error'}`,
      };
    }

    console.log('STK Push successful:', result.data);
    const data = result.data;

    // Store the STK Push request in the database for tracking
    try {
      const { error: dbError } = await supabase.from('mpesa_transactions').insert({
        checkout_request_id: data.CheckoutRequestID,
        phone_number: phoneNumber,
        amount: request.amount,
        account_reference: request.accountReference,
        transaction_desc: request.transactionDesc,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error('Error storing M-Pesa transaction:', dbError);
        // In development mode, we can continue even if there's an RLS error
        if (import.meta.env.DEV && dbError.code === '42501') {
          console.warn('Development mode: Ignoring RLS error for mpesa_transactions');
        }
      }
    } catch (error) {
      console.error('Exception storing M-Pesa transaction:', error);
      // Continue even if there's an error storing the transaction in development mode
      if (import.meta.env.DEV) {
        console.warn('Development mode: Continuing despite database error');
      }
    }

    return {
      success: true,
      message: 'Payment initiated successfully. Please check your phone to complete the payment.',
      data,
      checkoutRequestId: data.CheckoutRequestID,
    };
  } catch (error: any) {
    console.error('Error initiating M-Pesa payment:', error);

    // Provide more detailed error information
    let errorMessage = 'Failed to initiate payment';

    if (error.message) {
      errorMessage += `: ${error.message}`;
    }

    if (error.response) {
      console.error('Error response:', error.response);
    }

    if (error.data) {
      console.error('Error data:', error.data);
    }

    // Provide detailed error information for debugging
    console.warn('Detailed error information:');
    console.warn('Phone Number:', request.phoneNumber);
    console.warn('Amount:', request.amount);
    console.warn('Account Reference:', request.accountReference);
    console.warn('Transaction Description:', request.transactionDesc);

    // Create a response object with error details
    const errorResponse = {
      success: false,
      message: errorMessage,
      error: error,
    };

    // Log the full error response
    console.warn('Error response object:', errorResponse);

    return errorResponse;
  }
};

// Check the status of an STK Push transaction
export const checkTransactionStatus = async (checkoutRequestId: string): Promise<any> => {
  console.log(`Checking transaction status for checkout ID: ${checkoutRequestId}`);

  // Extract reference from checkout ID if possible
  let reference = 'unknown';
  if (checkoutRequestId.includes('WC-')) {
    const parts = checkoutRequestId.split('-');
    if (parts.length >= 3) {
      reference = `WC-${parts[2]}`;
      console.log(`Extracted reference from checkout ID: ${reference}`);
    }
  }

  try {
    // Get the auth token
    const token = await getAuthToken();

    // Get the timestamp
    const timestamp = getTimestamp();

    // Get the password
    const password = getPassword(timestamp);

    // Prepare the request body
    const body = {
      BusinessShortCode: MPESA_CONFIG.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    // Make the direct API call to M-Pesa
    console.log('Checking real transaction status with M-Pesa API');
    const result = await callMpesaApi(
      '/mpesa/stkpushquery/v1/query',
      'POST',
      body,
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    );

    if (!result.success) {
      console.error('M-Pesa transaction status check error:', result);
      return {
        success: false,
        message: `Failed to check transaction status: ${result.message || 'Unknown error'}`,
      };
    }

    console.log('Transaction status check successful:', result.data);
    const data = result.data;

    // Update the transaction status in the database
    try {
      if (data.ResultCode === '0') {
        const { error: updateError } = await supabase
          .from('mpesa_transactions')
          .update({
            status: 'completed',
            result_code: data.ResultCode,
            result_desc: data.ResultDesc,
            updated_at: new Date().toISOString(),
          })
          .eq('checkout_request_id', checkoutRequestId);

        if (updateError && import.meta.env.DEV) {
          console.warn('Development mode: Ignoring error updating mpesa_transactions:', updateError);
        }
      } else {
        const { error: updateError } = await supabase
          .from('mpesa_transactions')
          .update({
            status: 'failed',
            result_code: data.ResultCode,
            result_desc: data.ResultDesc,
            updated_at: new Date().toISOString(),
          })
          .eq('checkout_request_id', checkoutRequestId);

        if (updateError && import.meta.env.DEV) {
          console.warn('Development mode: Ignoring error updating mpesa_transactions:', updateError);
        }
      }
    } catch (error) {
      console.error('Error updating transaction status:', error);
      if (import.meta.env.DEV) {
        console.warn('Development mode: Continuing despite transaction update error');
      }
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('Error checking M-Pesa transaction status:', error);
    return {
      success: false,
      message: `Failed to check transaction status: ${error.message || 'Unknown error'}`,
    };
  }
};

// Process M-Pesa payment for a job
export const processJobPayment = async (
  jobId: string,
  workerId: string,
  customerId: string,
  amount: number,
  customerPhone: string,
  workerPhone: string
): Promise<any> => {
  // Log the payment details for debugging
  console.log('Processing real M-Pesa payment with the following details:');
  console.log(`Job ID: ${jobId}`);
  console.log(`Worker ID: ${workerId}`);
  console.log(`Customer ID: ${customerId}`);
  console.log(`Amount: ${amount}`);
  console.log(`Customer Phone: ${customerPhone}`);
  console.log(`Worker Phone: ${workerPhone}`);
  // Validate phone numbers
  if (!customerPhone.startsWith('+254')) {
    return {
      success: false,
      message: 'Customer phone number must start with +254'
    };
  }

  if (!workerPhone.startsWith('+254')) {
    return {
      success: false,
      message: 'Worker phone number must start with +254'
    };
  }

  try {
    // Generate a unique reference for this payment
    const reference = `WC-${Date.now().toString().substring(7)}`;

    // Initiate the STK Push to the customer's phone
    console.log(`Initiating STK Push to customer phone: ${customerPhone}`);
    console.log(`Payment will be sent to worker phone: ${workerPhone}`);

    // Format the phone number for M-Pesa API (remove the + sign)
    const formattedCustomerPhone = customerPhone.replace('+', '');

    const stkResponse = await initiateStkPush({
      phoneNumber: formattedCustomerPhone, // Send prompt to customer's phone
      amount,
      accountReference: reference,
      transactionDesc: `Payment for job ${jobId} to worker ${workerPhone.replace('+', '')}`,
    });

    console.log('STK Push response:', stkResponse);

    if (!stkResponse.success) {
      return stkResponse;
    }

    // Create a payment record in the database
    let paymentRecord = null;
    try {
      // Store both phone numbers and checkout request ID in the payment record
      const paymentData = {
        job_id: jobId,
        customer_id: customerId,
        worker_id: workerId,
        amount,
        payment_method: `mpesa:${customerPhone}:${workerPhone}:${reference}`,
        status: 'pending', // Will be updated to 'completed' after successful payment
        payment_date: new Date().toISOString(),
        mpesa_checkout_request_id: stkResponse.checkoutRequestId,
      };

      console.log('Creating payment record with data:', paymentData);

      const { data: payment, error: paymentError } = await supabase.from('payments').insert(paymentData).select().single();

      paymentRecord = payment;
      console.log('Payment record created:', paymentRecord);

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);

        // In development mode, we can continue even if there's an error
        if (import.meta.env.DEV) {
          console.warn('Development mode: Continuing despite payment record error');
          return {
            success: true,
            message: 'Payment initiated successfully. Please check your phone to complete the payment.',
            data: {
              payment: { id: 'mock-payment-id', status: 'pending' },
              mpesa: stkResponse.data,
            },
            checkoutRequestId: stkResponse.checkoutRequestId,
          };
        }

        return {
          success: false,
          message: `Failed to create payment record: ${paymentError.message}`,
        };
      }
    } catch (error: any) {
      console.error('Exception creating payment record:', error);

      // In development mode, we can continue even if there's an error
      if (import.meta.env.DEV) {
        console.warn('Development mode: Continuing despite payment record exception');
        return {
          success: true,
          message: 'Payment initiated successfully. Please check your phone to complete the payment.',
          data: {
            payment: { id: 'mock-payment-id', status: 'pending' },
            mpesa: stkResponse.data,
          },
          checkoutRequestId: stkResponse.checkoutRequestId,
        };
      }

      return {
        success: false,
        message: `Failed to create payment record: ${error.message || 'Unknown error'}`,
      };
    }

    // If we get here, the payment record was created successfully
    return {
      success: true,
      message: 'Payment initiated successfully. Please check your phone to complete the payment.',
      data: {
        payment: paymentRecord || { id: 'mock-payment-id', status: 'pending' },
        mpesa: stkResponse.data,
      },
      checkoutRequestId: stkResponse.checkoutRequestId,
    };
  } catch (error: any) {
    console.error('Error processing job payment:', error);

    // Provide more detailed error information
    let errorMessage = 'Failed to process payment';

    if (error.message) {
      errorMessage += `: ${error.message}`;
    }

    if (error.response) {
      console.error('Error response:', error.response);
    }

    if (error.data) {
      console.error('Error data:', error.data);
    }

    // Provide detailed error information for debugging
    console.warn('Detailed error information:');
    console.warn('Customer Phone:', customerPhone);
    console.warn('Worker Phone:', workerPhone);
    console.warn('Amount:', amount);
    console.warn('Job ID:', jobId);
    console.warn('Worker ID:', workerId);
    console.warn('Customer ID:', customerId);

    // Create a response object with error details
    const errorResponse = {
      success: false,
      message: errorMessage,
      error: error,
    };

    // Log the full error response in development mode
    if (import.meta.env.DEV) {
      console.warn('Error response object:', errorResponse);
    }

    return errorResponse;
  }
};

// Helper function to handle payment updates
const handlePaymentUpdate = async (
  payment: any,
  status: 'completed' | 'failed',
  transactionId?: string
): Promise<any> => {
  try {
    // Update the payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: status,
        mpesa_transaction_id: transactionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment status:', updateError);

      if (import.meta.env.DEV) {
        console.warn('Development mode: Ignoring payment update error');
      } else {
        return {
          success: false,
          message: `Failed to update payment status: ${updateError.message}`,
        };
      }
    }

    // If payment is completed, update the job status
    if (status === 'completed' && payment) {
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.job_id);

      if (jobUpdateError) {
        console.error('Error updating job status:', jobUpdateError);
      }
    }

    return {
      success: true,
      message: `Payment status updated to ${status}`,
    };
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    return {
      success: false,
      message: `Failed to update payment status: ${error.message || 'Unknown error'}`,
    };
  }
};

// Update payment status after M-Pesa callback
export const updatePaymentStatus = async (
  checkoutRequestId: string,
  status: 'completed' | 'failed',
  transactionId?: string
): Promise<any> => {
  try {
    // Find the payment with this checkout request ID
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('mpesa_checkout_request_id', checkoutRequestId)
      .single();

    if (findError) {
      console.error('Error finding payment:', findError);

      // Cannot continue without a valid payment record
      return {
        success: false,
        message: findError ? `Failed to find payment: ${findError.message}` : 'Payment record not found for this transaction'
      };
    }

    return await handlePaymentUpdate(payment, status, transactionId);
  } catch (error: any) {
    console.error('Error in updatePaymentStatus:', error);

    if (import.meta.env.DEV) {
      console.warn('Development mode: Continuing despite payment update error');
      return {
        success: true,
        message: `Development mode: Payment status would be updated to ${status}`,
      };
    }

    return {
      success: false,
      message: `Failed to update payment status: ${error.message || 'Unknown error'}`,
    };
  }
};

