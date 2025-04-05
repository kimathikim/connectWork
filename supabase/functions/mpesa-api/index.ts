// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// CORS headers for Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// M-Pesa API configuration
interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passKey: string;
  shortCode: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

// Get the base URL based on environment
const getBaseUrl = (environment: string): string => {
  return environment === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
};

// Interface for the request data
interface RequestData {
  endpoint: string;
  method: 'GET' | 'POST';
  body?: any;
  headers?: Record<string, string>;
  config?: {
    consumerKey?: string;
    consumerSecret?: string;
    passKey?: string;
    shortCode?: string;
    callbackUrl?: string;
    environment?: 'sandbox' | 'production';
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Edge Function started');

    // Parse the request body
    let requestData: RequestData;
    try {
      requestData = await req.json() as RequestData;
      console.log('Request data parsed successfully');
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Error parsing request body: ${parseError.message}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { endpoint, method, body, headers: requestHeaders, config: clientConfig } = requestData;

    console.log('Request details:', {
      endpoint,
      method,
      bodySize: body ? JSON.stringify(body).length : 0,
      hasHeaders: !!requestHeaders,
      hasConfig: !!clientConfig
    });

    // Get environment variables - prioritize client config, fall back to server env vars
    const MPESA_CONFIG: MpesaConfig = {
      // Use client config if provided, otherwise use server env vars
      consumerKey: clientConfig?.consumerKey || globalThis.Deno.env.get("MPESA_CONSUMER_KEY") || "",
      consumerSecret: clientConfig?.consumerSecret || globalThis.Deno.env.get("MPESA_CONSUMER_SECRET") || "",
      passKey: clientConfig?.passKey || globalThis.Deno.env.get("MPESA_PASS_KEY") || "",
      shortCode: clientConfig?.shortCode || globalThis.Deno.env.get("MPESA_SHORT_CODE") || "",
      callbackUrl: clientConfig?.callbackUrl || globalThis.Deno.env.get("MPESA_CALLBACK_URL") || "",
      environment: (clientConfig?.environment || globalThis.Deno.env.get("MPESA_ENVIRONMENT") || "sandbox") as "sandbox" | "production",
    };

    console.log(`Using M-Pesa ${MPESA_CONFIG.environment} environment`);
    console.log('Config details:', {
      hasConsumerKey: !!MPESA_CONFIG.consumerKey,
      hasConsumerSecret: !!MPESA_CONFIG.consumerSecret,
      hasPassKey: !!MPESA_CONFIG.passKey,
      hasShortCode: !!MPESA_CONFIG.shortCode,
      hasCallbackUrl: !!MPESA_CONFIG.callbackUrl,
      environment: MPESA_CONFIG.environment
    });

    // Validate configuration
    if (!MPESA_CONFIG.consumerKey || !MPESA_CONFIG.consumerSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "M-Pesa API credentials are not configured",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Construct the full URL
    const baseUrl = getBaseUrl(MPESA_CONFIG.environment);
    const url = `${baseUrl}${endpoint}`;

    console.log(`Making M-Pesa API call to: ${url}`);
    console.log(`Method: ${method}`);
    if (body) {
      console.log(`Request body: ${JSON.stringify(body)}`);
    }

    // Prepare headers
    const headers = {
      "Content-Type": "application/json",
      ...requestHeaders,
    };

    // Make the API call
    console.log(`Making API call to: ${url}`);
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: method !== "GET" ? JSON.stringify(body) : undefined,
      });
      console.log(`API call completed with status: ${response.status}`);
    } catch (fetchError: any) {
      console.error(`Fetch error: ${fetchError.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Fetch error: ${fetchError.message}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Parse the response
    let responseData: any;
    try {
      responseData = await response.json();
      console.log(`API Response parsed successfully`);
      console.log(`API Response: ${JSON.stringify(responseData)}`);
    } catch (jsonError: any) {
      console.error(`Error parsing API response: ${jsonError.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Error parsing API response: ${jsonError.message}`,
          status: response.status,
          statusText: response.statusText,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `API Error: ${response.status} ${response.statusText}`,
          data: responseData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        }
      );
    }

    // Return the successful response
    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(`Error processing request: ${error.message}`);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error processing request: ${error.message}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
