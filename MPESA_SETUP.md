# M-Pesa Integration Setup Guide

This guide will help you set up M-Pesa integration for WorkConnect.

## Prerequisites

1. A Safaricom Developer Account
   - Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
   - Create a new app to get your API credentials

2. M-Pesa API Credentials
   - Consumer Key
   - Consumer Secret
   - Pass Key
   - Short Code (Paybill or Till Number)

## Setup Instructions

### 1. Using the Setup Script (Recommended)

We've created a script to help you set up your M-Pesa credentials:

```bash
# Make the script executable
chmod +x scripts/setup-mpesa.sh

# Run the setup script
./scripts/setup-mpesa.sh
```

The script will:
- Create or update your .env file with M-Pesa credentials
- Deploy the Edge Function with the correct environment variables (optional)

### 2. Manual Setup

If you prefer to set up manually:

1. Create or update your `.env` file with the following variables:

```
VITE_MPESA_CONSUMER_KEY=your_consumer_key_here
VITE_MPESA_CONSUMER_SECRET=your_consumer_secret_here
VITE_MPESA_PASS_KEY=your_pass_key_here
VITE_MPESA_SHORT_CODE=your_short_code_here
VITE_MPESA_CALLBACK_URL=your_callback_url_here
VITE_MPESA_ENVIRONMENT=sandbox
```

2. Deploy the Edge Function with the same credentials:

```bash
# Export the environment variables
export MPESA_CONSUMER_KEY="your_consumer_key_here"
export MPESA_CONSUMER_SECRET="your_consumer_secret_here"
export MPESA_PASS_KEY="your_pass_key_here"
export MPESA_SHORT_CODE="your_short_code_here"
export MPESA_CALLBACK_URL="your_callback_url_here"
export MPESA_ENVIRONMENT="sandbox"

# Deploy the Edge Function
npx supabase functions deploy mpesa-api

# Set the environment variables for the Edge Function
npx supabase secrets set \
  MPESA_CONSUMER_KEY="$MPESA_CONSUMER_KEY" \
  MPESA_CONSUMER_SECRET="$MPESA_CONSUMER_SECRET" \
  MPESA_PASS_KEY="$MPESA_PASS_KEY" \
  MPESA_SHORT_CODE="$MPESA_SHORT_CODE" \
  MPESA_CALLBACK_URL="$MPESA_CALLBACK_URL" \
  MPESA_ENVIRONMENT="$MPESA_ENVIRONMENT"
```

## Testing

After setting up, you can test the M-Pesa integration:

1. Start your development server:
```bash
npm run dev
```

2. Navigate to a payment page and select M-Pesa as the payment method

3. Enter a valid phone number and complete the payment

## Troubleshooting

If you encounter issues:

1. Check your browser console for error messages
2. Verify your M-Pesa credentials are correct
3. Check the Edge Function logs:
```bash
npx supabase functions logs mpesa-api
```

## Switching to Production

When you're ready to go live:

1. Update your environment variables to use production credentials:
```
VITE_MPESA_ENVIRONMENT=production
```

2. Update the Edge Function environment:
```bash
export MPESA_ENVIRONMENT="production"
npx supabase secrets set MPESA_ENVIRONMENT="$MPESA_ENVIRONMENT"
```

## Additional Resources

- [M-Pesa API Documentation](https://developer.safaricom.co.ke/docs)
- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
