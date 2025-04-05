import { updatePaymentStatus } from '../lib/mpesa';

// This file would be used in a server environment
// For now, it's just a placeholder for how the callback would be handled

export const handleMpesaCallback = async (req: any) => {
  try {
    const { Body } = req.body;
    
    // Extract the relevant data from the callback
    const {
      ResultCode,
      ResultDesc,
      CheckoutRequestID,
      MpesaReceiptNumber
    } = Body.stkCallback;
    
    console.log('M-Pesa callback received:', {
      ResultCode,
      ResultDesc,
      CheckoutRequestID,
      MpesaReceiptNumber
    });
    
    // Update the transaction status in the database
    if (ResultCode === '0') {
      // Payment was successful
      await updatePaymentStatus(
        CheckoutRequestID,
        'completed',
        MpesaReceiptNumber
      );
      
      console.log('Payment completed successfully:', MpesaReceiptNumber);
    } else {
      // Payment failed
      await updatePaymentStatus(
        CheckoutRequestID,
        'failed'
      );
      
      console.log('Payment failed:', ResultDesc);
    }
    
    // Return a success response to M-Pesa
    return {
      statusCode: 200,
      body: JSON.stringify({ ResultCode: '0', ResultDesc: 'Success' })
    };
  } catch (error: any) {
    console.error('Error handling M-Pesa callback:', error);
    
    // Return an error response to M-Pesa
    return {
      statusCode: 500,
      body: JSON.stringify({ ResultCode: '1', ResultDesc: error.message || 'Internal server error' })
    };
  }
};
