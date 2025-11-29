/**
 * Razorpay Payment Service
 * 
 * Handles all Razorpay payment operations
 * Supports test mode with success/failure simulation
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
let razorpayInstance = null;

/**
 * Initialize Razorpay with API keys
 */
function initializeRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.warn('⚠️ Razorpay keys not found. Payment operations will be simulated.');
    return null;
  }

  try {
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    console.log('✅ Razorpay initialized successfully');
    return razorpayInstance;
  } catch (error) {
    console.error('❌ Error initializing Razorpay:', error);
    return null;
  }
}

// Initialize on module load
initializeRazorpay();

/**
 * Check if Razorpay is in test mode
 */
function isTestMode() {
  return process.env.RAZORPAY_TEST_MODE === 'true' || !razorpayInstance;
}

/**
 * Create Razorpay order
 * @param {Object} options - { amount, currency, receipt, notes }
 * @returns {Promise<Object>} Razorpay order object
 */
async function createOrder(options) {
  const { amount, currency = 'INR', receipt, notes = {} } = options;

  // Validate amount (Razorpay expects amount in paise)
  const amountInPaise = Math.round(amount * 100);
  if (amountInPaise < 100) {
    throw new Error('Minimum payment amount is ₹1');
  }

  // Test mode: Simulate order creation
  if (isTestMode()) {
    const testOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: testOrderId,
      entity: 'order',
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      status: 'created',
      attempts: 0,
      notes: notes,
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  // Production mode: Create actual Razorpay order
  try {
    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes,
    });

    return order;
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    throw new Error(`Failed to create payment order: ${error.message}`);
  }
}

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} True if signature is valid
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  // Test mode: Always return true (simulate successful verification)
  if (isTestMode()) {
    return true;
  }

  // Production mode: Verify signature
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  } catch (error) {
    console.error('❌ Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Fetch Razorpay payment details
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
async function fetchPayment(paymentId) {
  // Test mode: Simulate payment fetch
  if (isTestMode()) {
    // Simulate success or failure based on test mode configuration
    const simulateFailure = process.env.RAZORPAY_SIMULATE_FAILURE === 'true';
    
    if (simulateFailure) {
      throw new Error('Payment failed (simulated)');
    }

    return {
      id: paymentId,
      entity: 'payment',
      amount: 0, // Will be set by caller
      currency: 'INR',
      status: 'captured',
      order_id: `order_test_${Date.now()}`,
      method: 'card',
      description: 'Test payment',
      created_at: Math.floor(Date.now() / 1000),
    };
  }

  // Production mode: Fetch actual payment
  try {
    const payment = await razorpayInstance.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('❌ Error fetching Razorpay payment:', error);
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
}

/**
 * Simulate payment success/failure for testing
 * @param {string} orderId - Order ID
 * @param {number} amount - Payment amount
 * @param {boolean} shouldFail - Whether to simulate failure
 * @returns {Object} Simulated payment response
 */
function simulatePayment(orderId, amount, shouldFail = false) {
  if (shouldFail) {
    return {
      success: false,
      error: {
        code: 'PAYMENT_FAILED',
        description: 'Payment failed (simulated)',
        source: 'gateway',
        step: 'payment',
        reason: 'insufficient_funds',
      },
    };
  }

  const paymentId = `pay_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    success: true,
    payment: {
      id: paymentId,
      entity: 'payment',
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      status: 'captured',
      order_id: orderId,
      method: 'card',
      description: 'Test payment (simulated)',
      created_at: Math.floor(Date.now() / 1000),
    },
  };
}

module.exports = {
  createOrder,
  verifyPaymentSignature,
  fetchPayment,
  simulatePayment,
  isTestMode,
  initializeRazorpay,
};

