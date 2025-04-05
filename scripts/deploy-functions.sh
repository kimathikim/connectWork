#!/bin/bash

# Make the script exit on any error
set -e

# Check if user is logged in to Supabase
if ! npx supabase projects list &> /dev/null; then
  echo "You are not logged in to Supabase. Please login first."
  npx supabase login
fi

# Get project reference from environment or use default
PROJECT_REF=${PROJECT_REF:-"gwngnllovkuhhjwhpyvj"}

# Deploy the M-Pesa API Edge Function
echo "Deploying M-Pesa API Edge Function to project $PROJECT_REF..."
npx supabase functions deploy mpesa-api --project-ref $PROJECT_REF

# Check if environment variables are set
if [ -z "$MPESA_CONSUMER_KEY" ] || [ -z "$MPESA_CONSUMER_SECRET" ]; then
  echo "Warning: MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not set."
  echo "You can set them manually using:"
  echo "npx supabase secrets set MPESA_CONSUMER_KEY=your_key MPESA_CONSUMER_SECRET=your_secret --project-ref $PROJECT_REF"
else
  # Set environment variables for the Edge Function
  echo "Setting environment variables..."

  # Determine the environment (default to sandbox if not specified)
  MPESA_ENV=${MPESA_ENVIRONMENT:-sandbox}
  echo "Using M-Pesa environment: $MPESA_ENV"

  npx supabase secrets set \
    MPESA_CONSUMER_KEY="$MPESA_CONSUMER_KEY" \
    MPESA_CONSUMER_SECRET="$MPESA_CONSUMER_SECRET" \
    MPESA_PASS_KEY="$MPESA_PASS_KEY" \
    MPESA_SHORT_CODE="$MPESA_SHORT_CODE" \
    MPESA_CALLBACK_URL="$MPESA_CALLBACK_URL" \
    MPESA_ENVIRONMENT="$MPESA_ENV" \
    --project-ref $PROJECT_REF
fi

echo "Deployment completed successfully!"
echo "You can test the function using:"
echo "curl -X POST https://$PROJECT_REF.supabase.co/functions/v1/mpesa-api \"
echo "  -H \"Content-Type: application/json\" \"
echo "  -d '{\"endpoint\":\"/oauth/v1/generate?grant_type=client_credentials\",\"method\":\"GET\",\"headers\":{\"Authorization\":\"Basic base64-encoded-credentials\"}}'"
