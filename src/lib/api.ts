// Import supabase client
import { supabase } from './supabase';

// Function to make API calls through a backend proxy to avoid CORS issues
export const callMpesaApi = async (
  endpoint: string,
  method: 'GET' | 'POST',
  body?: any,
  headers?: Record<string, string>
): Promise<any> => {
  console.log(`API Call: ${method} ${endpoint}`);
  if (body) {
    console.log('Request body:', JSON.stringify(body, null, 2));
  }

  try {

    // Call the Supabase Edge Function to handle the M-Pesa API request
    console.log('Calling M-Pesa API via Supabase Edge Function');

    // Get environment configuration from client-side env variables
    const mpesaConfig = {
      consumerKey: import.meta.env.VITE_MPESA_CONSUMER_KEY || '',
      consumerSecret: import.meta.env.VITE_MPESA_CONSUMER_SECRET || '',
      passKey: import.meta.env.VITE_MPESA_PASS_KEY || '',
      shortCode: import.meta.env.MPESA_SHORT_CODE || '174379',
      callbackUrl: import.meta.env.MPESA_CALLBACK_URL || 'https://connectwork.vercel.app/api/mpesa/callback',
      environment: import.meta.env.MPESA_ENVIRONMENT || 'sandbox'
    };

    console.log(`Using M-Pesa ${mpesaConfig.environment} environment`);

    try {
      console.log('Invoking Edge Function with params:', {
        endpoint,
        method,
        bodySize: body ? JSON.stringify(body).length : 0,
        hasHeaders: !!headers,
        config: {
          ...mpesaConfig,
          // Don't log sensitive data
          consumerKey: mpesaConfig.consumerKey ? '***' : undefined,
          consumerSecret: mpesaConfig.consumerSecret ? '***' : undefined,
          passKey: mpesaConfig.passKey ? '***' : undefined,
        }
      });

      const { data, error } = await supabase.functions.invoke('mpesa-api', {
        body: {
          endpoint,
          method,
          body,
          headers,
          config: mpesaConfig // Pass the configuration to the Edge Function
        }
      });

      if (error) {
        console.error('Error calling M-Pesa API Edge Function:', error);
        return {
          success: false,
          message: `Failed to call M-Pesa API Edge Function: ${error.message || 'Unknown error'}`
        };
      }

      if (!data) {
        console.error('Edge Function returned no data');
        return {
          success: false,
          message: 'Edge Function returned no data'
        };
      }

      console.log('Edge Function response:', data);
      return data;
    } catch (edgeError: any) {
      console.error('Exception calling M-Pesa API Edge Function:', edgeError);

      // Try to extract more detailed error information
      let errorMessage = 'Exception calling M-Pesa API Edge Function';

      if (edgeError.message) {
        errorMessage = edgeError.message;
      }

      if (edgeError.error && typeof edgeError.error === 'object') {
        if (edgeError.error.message) {
          errorMessage = edgeError.error.message;
        } else if (edgeError.error.details) {
          errorMessage = edgeError.error.details;
        }
      }

      // Check for network errors
      if (errorMessage.includes('NetworkError') || errorMessage.includes('network')) {
        errorMessage = 'Network error connecting to M-Pesa API. Please check your internet connection.';
      }

      // Check for authentication errors
      if (errorMessage.includes('authentication') || errorMessage.includes('auth') ||
          errorMessage.includes('401') || errorMessage.includes('403')) {
        errorMessage = 'Authentication error with M-Pesa API. Please check your API credentials.';
      }

      return {
        success: false,
        message: errorMessage,
        error: edgeError
      };
    }
  } catch (error: any) {
    console.error('Error calling M-Pesa API:', error);
    return {
      success: false,
      message: error.message || 'Failed to call M-Pesa API'
    };
  }
};
