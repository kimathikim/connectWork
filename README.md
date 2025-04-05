# WorkConnect

A platform connecting customers with skilled workers for various services.

## Environment Variables

The application requires several environment variables to be set up for proper functionality. Copy the `.env.example` file to a new file named `.env` and fill in the required values:

```bash
cp .env.example .env
```

### Supabase Configuration

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### M-Pesa API Configuration

To enable M-Pesa payments, you need to set up the following environment variables:

- `VITE_MPESA_CONSUMER_KEY`: Your M-Pesa API consumer key
- `VITE_MPESA_CONSUMER_SECRET`: Your M-Pesa API consumer secret
- `VITE_MPESA_PASS_KEY`: Your M-Pesa API pass key
- `VITE_MPESA_SHORT_CODE`: Your M-Pesa shortcode (default: 174379 for sandbox)
- `VITE_MPESA_CALLBACK_URL`: URL for M-Pesa to send payment notifications
- `VITE_MPESA_ENVIRONMENT`: Either 'sandbox' or 'production'

## Getting M-Pesa API Credentials

To get M-Pesa API credentials:

1. Register for a Safaricom Developer Account at [https://developer.safaricom.co.ke/](https://developer.safaricom.co.ke/)
2. Create a new app in the developer portal
3. Select the M-Pesa APIs you want to use (at minimum, you need the STK Push API)
4. Once your app is approved, you'll receive the Consumer Key, Consumer Secret, and Pass Key
5. For testing, use the sandbox environment credentials

## Running the Application

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

## Database Migrations

To apply the database migrations:

```bash
npx supabase migration up
```

This will create the necessary tables for M-Pesa transactions and update the payments table with the required columns.