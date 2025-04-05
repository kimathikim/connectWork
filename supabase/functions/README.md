# Supabase Edge Functions

This directory contains Edge Functions for the WorkConnect application.

## M-Pesa API Edge Function

The `mpesa-api` Edge Function serves as a proxy for making M-Pesa API calls from the frontend. This is necessary to avoid CORS issues when making direct API calls to the M-Pesa API from the browser.

### Deployment

To deploy the Edge Function, follow these steps:

1. You don't need to install the Supabase CLI globally. We'll use `npx` to run the Supabase CLI commands.

2. Login to Supabase:
   ```bash
   npx supabase login
   ```

3. Set the required environment variables:
   ```bash
   export MPESA_CONSUMER_KEY="your-consumer-key"
   export MPESA_CONSUMER_SECRET="your-consumer-secret"
   export MPESA_PASS_KEY="your-pass-key"
   export MPESA_SHORT_CODE="your-short-code"
   export MPESA_CALLBACK_URL="your-callback-url"
   export MPESA_ENVIRONMENT="sandbox" # or "production"
   ```

   **Important Note on Environment:**
   - The Edge Function will use the environment specified in the client-side configuration first.
   - If not provided by the client, it will fall back to the server-side environment variable.
   - If neither is specified, it defaults to "sandbox".
   - Make sure both your client-side `.env` file and server-side environment variables are set correctly.

4. Run the deployment script:
   ```bash
   ./scripts/deploy-functions.sh
   ```

### Testing

You can test the Edge Function locally using the Supabase CLI with npx:

```bash
npx supabase functions serve --env-file .env.local
```

Then, make a request to the function:

```bash
curl -X POST http://localhost:54321/functions/v1/mpesa-api \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"/oauth/v1/generate?grant_type=client_credentials","method":"GET","headers":{"Authorization":"Basic base64-encoded-credentials"}}'
```

### Usage

The Edge Function accepts the following parameters:

- `endpoint`: The M-Pesa API endpoint to call (e.g., `/oauth/v1/generate?grant_type=client_credentials`)
- `method`: The HTTP method to use (e.g., `GET`, `POST`)
- `body`: The request body (for `POST` requests)
- `headers`: Additional headers to include in the request

Example:

```javascript
// Get environment configuration from client-side env variables
const mpesaConfig = {
  consumerKey: import.meta.env.VITE_MPESA_CONSUMER_KEY || '',
  consumerSecret: import.meta.env.VITE_MPESA_CONSUMER_SECRET || '',
  passKey: import.meta.env.VITE_MPESA_PASS_KEY || '',
  shortCode: import.meta.env.VITE_MPESA_SHORT_CODE || '174379',
  callbackUrl: import.meta.env.VITE_MPESA_CALLBACK_URL || 'https://connectwork.vercel.app/api/mpesa/callback',
  environment: import.meta.env.VITE_MPESA_ENVIRONMENT || 'sandbox'
};

const { data, error } = await supabase.functions.invoke('mpesa-api', {
  body: {
    endpoint: '/oauth/v1/generate?grant_type=client_credentials',
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(`${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`)}`
    },
    config: mpesaConfig // Pass the configuration to the Edge Function
  }
});
```

The function returns a response with the following structure:

```javascript
{
  success: true,
  data: {
    // The response from the M-Pesa API
  }
}
```

Or, in case of an error:

```javascript
{
  success: false,
  message: 'Error message',
  data: {
    // The error response from the M-Pesa API, if available
  }
}
```
