# M-Pesa Integration Guide

This document provides detailed information about the M-Pesa integration in the WorkConnect application.

## Overview

The WorkConnect application uses M-Pesa's STK Push API to process payments. When a customer completes a job, they can choose to pay the worker using M-Pesa. The payment is sent directly to the worker's phone number.

## Technical Implementation

### Files

- `src/lib/mpesa.ts`: Contains all the M-Pesa API integration code
- `supabase/migrations/20250224000001_add_mpesa_support.sql`: Database migration for M-Pesa support
- `.env`: Environment variables for M-Pesa API credentials

### Environment Variables

The following environment variables are required for M-Pesa integration:

```
VITE_MPESA_CONSUMER_KEY=your_consumer_key_here
VITE_MPESA_CONSUMER_SECRET=your_consumer_secret_here
VITE_MPESA_PASS_KEY=your_pass_key_here
VITE_MPESA_SHORT_CODE=174379
VITE_MPESA_CALLBACK_URL=https://connectwork.vercel.app/api/mpesa/callback
VITE_MPESA_ENVIRONMENT=sandbox
```

### Database Schema

The M-Pesa integration uses two tables:

1. `payments`: Stores payment information for all payment methods
   - Added columns:
     - `mpesa_checkout_request_id`: The checkout request ID from M-Pesa
     - `mpesa_transaction_id`: The transaction ID from M-Pesa

2. `mpesa_transactions`: Tracks M-Pesa transactions
   - Columns:
     - `id`: UUID primary key
     - `checkout_request_id`: The checkout request ID from M-Pesa
     - `phone_number`: The phone number the payment was sent to
     - `amount`: The payment amount
     - `account_reference`: Reference for the payment
     - `transaction_desc`: Description of the transaction
     - `mpesa_receipt_number`: Receipt number from M-Pesa
     - `transaction_date`: Date and time of the transaction
     - `status`: Status of the transaction (pending, completed, failed)
     - `result_code`: Result code from M-Pesa
     - `result_desc`: Result description from M-Pesa
     - `created_at`: Timestamp when the record was created
     - `updated_at`: Timestamp when the record was last updated

### Payment Flow

1. Customer initiates payment with M-Pesa
2. Application gets the worker's phone number
3. Application initiates STK Push to the worker's phone
4. Worker receives prompt on their phone to enter M-Pesa PIN
5. Application polls M-Pesa API to check transaction status
6. Once payment is confirmed, job is marked as completed

### Functions

The `mpesa.ts` file provides the following functions:

- `getAuthToken()`: Gets an authorization token from M-Pesa API
- `getTimestamp()`: Formats the timestamp for M-Pesa API
- `getPassword()`: Generates the password for STK Push
- `initiateStkPush()`: Initiates STK Push to the worker's phone
- `checkTransactionStatus()`: Checks the status of an STK Push transaction
- `processJobPayment()`: Processes payment for a job
- `updatePaymentStatus()`: Updates payment status after M-Pesa callback

## Testing

For testing, use the sandbox environment:

- Set `VITE_MPESA_ENVIRONMENT=sandbox` in your `.env` file
- Use the test credentials provided by Safaricom
- In the sandbox environment, you don't need to enter a real M-Pesa PIN
- The sandbox will simulate successful or failed transactions

## Production Deployment

For production:

1. Get production credentials from Safaricom
2. Set `VITE_MPESA_ENVIRONMENT=production` in your `.env` file
3. Update the callback URL to your production URL
4. Ensure your server can receive callbacks from M-Pesa

## Troubleshooting

Common issues:

1. **Invalid phone number format**: Ensure phone numbers are in the format `254XXXXXXXXX` (no leading zero)
2. **Authentication errors**: Check your consumer key and secret
3. **Transaction failures**: Check the result code and description from M-Pesa
4. **Callback not received**: Ensure your callback URL is accessible from the internet

## Resources

- [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
- [M-Pesa API Documentation](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate)
- [STK Push API Reference](https://developer.safaricom.co.ke/Documentation/Home#lnk-APIs-STK%20Push)
