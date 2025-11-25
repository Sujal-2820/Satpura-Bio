/**
 * Vendor API Service
 * 
 * This file contains all API endpoints for the Vendor dashboard.
 * All endpoints are backend-ready and will work once the backend is implemented.
 * 
 * Base URL should be configured in environment variables:
 * - Development: http://localhost:3000/api
 * - Production: https://api.irasathi.com/api
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * API Response Handler
 */
async function handleResponse(response) {
  const data = await response.json().catch(() => ({ 
    success: false,
    error: { message: 'An error occurred' }
  }))
  
  if (!response.ok) {
    // Return error in same format as success response for consistent error handling
    const errorResponse = {
      success: false,
      error: {
        message: data.message || data.error?.message || `HTTP error! status: ${response.status}`,
        status: response.status,
      },
    }
    
    // If 401, also clear token
    if (response.status === 401) {
      localStorage.removeItem('vendor_token')
    }
    
    return errorResponse
  }
  
  return data
}

/**
 * API Request Helper
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('vendor_token') // Vendor authentication token
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  return handleResponse(response)
}

// ============================================================================
// AUTHENTICATION APIs
// ============================================================================

/**
 * Request OTP for Vendor
 * POST /vendors/auth/request-otp
 * 
 * @param {Object} data - { phone }
 * @returns {Promise<Object>} - { message: 'OTP sent successfully', expiresIn: 300 }
 */
export async function requestVendorOTP(data) {
  return apiRequest('/vendors/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Register Vendor with OTP
 * POST /vendors/auth/register
 * 
 * @param {Object} data - { fullName, phone, location }
 * @returns {Promise<Object>} - { message, vendorId, requiresApproval, expiresIn }
 */
export async function registerVendor(data) {
  return apiRequest('/vendors/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: data.fullName || data.name,
      phone: data.phone,
      location: data.location || {
        address: data.address || '',
        city: data.location?.city || '',
        state: data.location?.state || '',
        pincode: data.location?.pincode || '',
        coordinates: data.location?.coordinates || data.coordinates || { lat: data.lat, lng: data.lng },
      },
    }),
  })
}

/**
 * Login Vendor with OTP
 * POST /vendors/auth/verify-otp
 * 
 * @param {Object} data - { phone, otp }
 * @returns {Promise<Object>} - { token, vendor: { id, name, phone, location, coverageRadius } }
 */
export async function loginVendorWithOtp(data) {
  return apiRequest('/vendors/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Vendor Login (Legacy - email/password)
 * POST /vendors/login
 * 
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} - { token, vendor: { id, name, email, phone, location, coverageRadius } }
 */
export async function loginVendor(credentials) {
  // Simulate API call - replace with actual API call when backend is ready
  return new Promise((resolve) => {
    setTimeout(() => {
      if (credentials.email === 'vendor@example.com' && credentials.password === 'password') {
        resolve({
          success: true,
          data: {
            token: 'fake-vendor-token',
            vendor: {
              id: 'vendor-001',
              name: 'Suresh Patel',
              email: credentials.email,
              phone: '+91 9876543210',
              location: { lat: 19.2183, lng: 73.0822, address: 'Kolhapur, Maharashtra' },
              coverageRadius: 20,
            },
          },
        })
      } else {
        resolve({ success: false, error: { message: 'Invalid credentials' } })
      }
    }, 1000)
  })
}

/**
 * Vendor Logout
 * POST /vendors/auth/logout
 * 
 * @returns {Promise<Object>} - { message: 'Logged out successfully' }
 */
export async function logoutVendor() {
  return apiRequest('/vendors/auth/logout', {
    method: 'POST',
  })
}

/**
 * Get Vendor Profile
 * GET /vendors/auth/profile
 * 
 * @returns {Promise<Object>} - Vendor profile data
 */
export async function getVendorProfile() {
  return apiRequest('/vendors/auth/profile')
}

// ============================================================================
// DASHBOARD & OVERVIEW APIs
// ============================================================================

/**
 * Get Vendor Dashboard Overview
 * GET /vendors/dashboard
 * 
 * @returns {Promise<Object>} - {
 *   ordersToday: number,
 *   urgentStock: number,
 *   creditBalance: number,
 *   creditDue: string,
 *   recentActivity: Array,
 *   highlights: Array
 * }
 */
export async function fetchDashboardData() {
  return apiRequest('/vendors/dashboard')
}

// ============================================================================
// ORDERS APIs
// ============================================================================

/**
 * Get All Orders
 * GET /vendors/orders
 * 
 * @param {Object} params - { status, limit, offset, startDate, endDate }
 * @returns {Promise<Object>} - { orders: Array, total: number, stats: Object }
 */
export async function getOrders(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/orders?${queryParams}`)
}

/**
 * Get Order Details
 * GET /vendors/orders/:orderId
 * 
 * IMPORTANT: The response should include item-level stock availability:
 * - Each order item should have: { itemId, productId, name, quantity, availableStock, status: 'in_stock' | 'out_of_stock' | 'insufficient' }
 * - This allows vendor to see which items they can fulfill and which need to be escalated
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { 
 *   order: {
 *     id: string,
 *     items: Array<{ itemId, productId, name, quantity, availableStock, status }>,
 *     farmer: string,
 *     value: string,
 *     payment: string,
 *     status: string
 *   }
 * }
 */
export async function getOrderDetails(orderId) {
  return apiRequest(`/vendors/orders/${orderId}`)
}

/**
 * Accept Order (Mark as Available)
 * POST /vendors/orders/:orderId/accept
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { message: 'Order accepted', order: Object }
 */
export async function acceptOrder(orderId) {
  return apiRequest(`/vendors/orders/${orderId}/accept`, {
    method: 'POST',
  })
}

/**
 * Accept Order Partially (Accept some items, reject others)
 * POST /vendors/orders/:orderId/accept-partial
 * 
 * IMPORTANT: This API handles partial order fulfillment where:
 * - Items that vendor has in stock → Vendor fulfills those items
 * - Items that vendor doesn't have (or insufficient quantity) → Escalated to Admin
 * 
 * @param {string} orderId - Order ID
 * @param {Object} partialData - {
 *   acceptedItems: Array<{ itemId: string, quantity: number }>, // Items vendor can fulfill
 *   rejectedItems: Array<{ itemId: string, quantity: number, reason?: string }>, // Items to escalate to Admin
 *   notes?: string
 * }
 * @returns {Promise<Object>} - { 
 *   message: 'Order partially accepted',
 *   vendorOrder: Object, // Order for vendor to fulfill
 *   adminOrder: Object, // Order escalated to admin
 *   order: Object // Original order with split status
 * }
 */
export async function acceptOrderPartially(orderId, partialData) {
  return apiRequest(`/vendors/orders/${orderId}/accept-partial`, {
    method: 'POST',
    body: JSON.stringify(partialData),
  })
}

/**
 * Reject Order (Mark as Not Available)
 * POST /vendors/orders/:orderId/reject
 * 
 * @param {string} orderId - Order ID
 * @param {Object} reasonData - { reason: string, notes?: string }
 * @returns {Promise<Object>} - { message: 'Order rejected', order: Object }
 */
export async function rejectOrder(orderId, reasonData) {
  return apiRequest(`/vendors/orders/${orderId}/reject`, {
    method: 'POST',
    body: JSON.stringify(reasonData),
  })
}

/**
 * Update Order Status
 * PUT /vendors/orders/:orderId/status
 * 
 * IMPORTANT: This status update must be persisted and immediately reflected in the User Dashboard.
 * 
 * @param {string} orderId - Order ID
 * @param {Object} statusData - { status: 'awaiting' | 'dispatched' | 'delivered', notes?: string }
 * @returns {Promise<Object>} - { message: 'Status updated', order: Object with statusTimeline }
 */
export async function updateOrderStatus(orderId, statusData) {
  return apiRequest(`/vendors/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify(statusData),
  })
}

/**
 * Get Order Statistics
 * GET /vendors/orders/stats
 * 
 * @param {Object} params - { period: 'day' | 'week' | 'month' }
 * @returns {Promise<Object>} - { total, awaiting, processing, delivered, revenue }
 */
export async function getOrderStats(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/orders/stats?${queryParams}`)
}

// ============================================================================
// PRODUCT APIs (For vendors to view and order products)

/**
 * Get All Products Available for Ordering
 * GET /vendors/products
 * 
 * @param {Object} params - Query parameters { page, limit, category, search, sortBy, sortOrder }
 * @returns {Promise<Object>} - { products: Array, pagination: Object }
 */
export async function getProducts(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/products?${queryParams}`)
}

/**
 * Get Product Details
 * GET /vendors/products/:productId
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - Detailed product information
 */
export async function getProductDetails(productId) {
  return apiRequest(`/vendors/products/${productId}`)
}

// INVENTORY APIs
// ============================================================================

/**
 * Get All Inventory Items
 * GET /vendors/inventory
 * 
 * @param {Object} params - { status, search, limit, offset }
 * @returns {Promise<Object>} - { items: Array, total: number, stats: Object }
 */
export async function getInventory(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/inventory?${queryParams}`)
}

/**
 * Get Inventory Item Details
 * GET /vendors/inventory/:itemId
 * 
 * @param {string} itemId - Inventory item ID
 * @returns {Promise<Object>} - Detailed inventory item information
 */
export async function getInventoryItemDetails(itemId) {
  return apiRequest(`/vendors/inventory/${itemId}`)
}

/**
 * Update Inventory Stock
 * PUT /vendors/inventory/:itemId/stock
 * 
 * @param {string} itemId - Inventory item ID
 * @param {Object} stockData - { quantity: number, notes?: string }
 * @returns {Promise<Object>} - { message: 'Stock updated', item: Object }
 */
export async function updateInventoryStock(itemId, stockData) {
  return apiRequest(`/vendors/inventory/${itemId}/stock`, {
    method: 'PUT',
    body: JSON.stringify(stockData),
  })
}

/**
 * Get Inventory Statistics
 * GET /vendors/inventory/stats
 * 
 * @returns {Promise<Object>} - { totalItems, lowStock, criticalStock, healthyStock, totalValue }
 */
export async function getInventoryStats() {
  return apiRequest('/vendors/inventory/stats')
}

// ============================================================================
// CREDIT MANAGEMENT APIs
// ============================================================================

/**
 * Get Credit Information
 * GET /vendors/credit
 * 
 * @returns {Promise<Object>} - {
 *   limit: number,
 *   used: number,
 *   remaining: number,
 *   penalty: number,
 *   dueDate: string,
 *   repaymentDays: number,
 *   penaltyRate: number
 * }
 */
export async function getCreditInfo() {
  return apiRequest('/vendors/credit')
}

/**
 * Request Credit Purchase (Purchase from Admin)
 * POST /vendors/credit/purchase
 * 
 * @param {Object} purchaseData - {
 *   items: Array<{ productId: string, quantity: number, price: number }>,
 *   totalAmount: number,
 *   notes?: string
 * }
 * @returns {Promise<Object>} - { requestId, message, status }
 */
export async function requestCreditPurchase(purchaseData) {
  return apiRequest('/vendors/credit/purchase', {
    method: 'POST',
    body: JSON.stringify(purchaseData),
  })
}

/**
 * Get Credit Purchase Requests
 * GET /vendors/credit/purchases
 * 
 * @param {Object} params - { status, limit, offset }
 * @returns {Promise<Object>} - { purchases: Array, total: number }
 */
export async function getCreditPurchases(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/credit/purchases?${queryParams}`)
}

/**
 * Get Credit Purchase Details
 * GET /vendors/credit/purchases/:requestId
 * 
 * @param {string} requestId - Purchase request ID
 * @returns {Promise<Object>} - Purchase request details
 */
export async function getCreditPurchaseDetails(requestId) {
  return apiRequest(`/vendors/credit/purchases/${requestId}`)
}

/**
 * Get Credit History
 * GET /vendors/credit/history
 * 
 * @param {Object} params - { limit, offset, startDate, endDate }
 * @returns {Promise<Object>} - { transactions: Array, total: number }
 */
export async function getCreditHistory(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/credit/history?${queryParams}`)
}

// ============================================================================
// REPORTS & ANALYTICS APIs
// ============================================================================

/**
 * Get Reports Data
 * GET /vendors/reports
 * 
 * @param {Object} params - { period: 'day' | 'week' | 'month' | 'year', type: 'revenue' | 'performance' | 'trends' }
 * @returns {Promise<Object>} - Reports data based on type
 */
export async function getReports(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/reports?${queryParams}`)
}

/**
 * Get Performance Analytics
 * GET /vendors/reports/analytics
 * 
 * @param {Object} params - { period: 'week' | 'month' | 'year' }
 * @returns {Promise<Object>} - Performance metrics and charts data
 */
export async function getPerformanceAnalytics(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/reports/analytics?${queryParams}`)
}

/**
 * Get Region Analytics (20km coverage)
 * Note: This endpoint may not exist in backend. Check getPerformanceAnalytics or getReports instead.
 * GET /vendors/reports/region
 * 
 * @returns {Promise<Object>} - Region-wise order and revenue analytics
 */
export async function getRegionAnalytics() {
  // Try reports endpoint which might include region data
  return apiRequest('/vendors/reports?type=region').catch(() => {
    // Fallback to performance analytics if region endpoint doesn't exist
    return apiRequest('/vendors/reports/analytics?period=month')
  })
}

// ============================================================================
// REAL-TIME NOTIFICATIONS
// ============================================================================

/**
 * Initialize Real-time Connection
 * Sets up WebSocket or polling connection for real-time updates
 * 
 * @param {Function} onNotification - Callback function for notifications
 * @returns {Function} - Cleanup function
 */
export function initializeRealtimeConnection(onNotification) {
  // Simulate real-time connection
  const interval = setInterval(() => {
    // Simulate various notification types
    const notifications = [
      {
        type: 'order_assigned',
        title: 'New Order Received',
        message: 'You have a new order from Anand Kumar (₹48,600)',
        timestamp: new Date().toISOString(),
        data: { orderId: 'ord-1', customerName: 'Anand Kumar', amount: 48600 },
      },
      {
        type: 'order_status_changed',
        title: 'Order Status Updated',
        message: 'Order #ord-2 has been updated to Processing',
        timestamp: new Date().toISOString(),
        data: { orderId: 'ord-2', status: 'processing' },
      },
      {
        type: 'credit_purchase_approved',
        title: 'Purchase Request Approved',
        message: 'Your credit purchase request has been approved by Admin',
        timestamp: new Date().toISOString(),
        data: { requestId: 'CR-123', amount: 50000 },
      },
      {
        type: 'credit_purchase_rejected',
        title: 'Purchase Request Rejected',
        message: 'Your credit purchase request has been rejected. Please contact Admin.',
        timestamp: new Date().toISOString(),
        data: { requestId: 'CR-124', reason: 'Insufficient credit limit' },
      },
      {
        type: 'credit_due_reminder',
        title: 'Credit Payment Due',
        message: 'Your credit payment of ₹1.2L is due in 8 days',
        timestamp: new Date().toISOString(),
        data: { dueDate: '2025-12-08', amount: 120000 },
      },
      {
        type: 'inventory_low_alert',
        title: 'Low Stock Alert',
        message: 'Micro Nutrients stock is running low (210 kg remaining)',
        timestamp: new Date().toISOString(),
        data: { itemId: 'inv-3', itemName: 'Micro Nutrients', stock: 210 },
      },
      {
        type: 'admin_announcement',
        title: 'Admin Announcement',
        message: 'New product catalog updated. Check inventory section for details.',
        timestamp: new Date().toISOString(),
        data: {},
      },
    ]

    // Randomly send notifications (simulate real-time behavior)
    if (Math.random() < 0.1) {
      const notification = notifications[Math.floor(Math.random() * notifications.length)]
      onNotification(notification)
    }
  }, 10000) // Check every 10 seconds

  return () => clearInterval(interval)
}

/**
 * Handle Real-time Notification
 * Processes incoming notifications and dispatches appropriate actions
 * 
 * @param {Object} notification - Notification object
 * @param {Function} dispatch - Context dispatch function
 * @param {Function} showToast - Toast notification function
 */
export function handleRealtimeNotification(notification, dispatch, showToast) {
  switch (notification.type) {
    case 'order_assigned':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
      showToast(notification.message, 'info')
      break

    case 'order_status_changed':
      dispatch({ type: 'UPDATE_ORDER_STATUS', payload: notification.data })
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'info')
      break

    case 'credit_purchase_approved':
      dispatch({ type: 'UPDATE_CREDIT_BALANCE', payload: { isIncrement: true, amount: notification.data.amount } })
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'success')
      break

    case 'credit_purchase_rejected':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'error')
      break

    case 'credit_due_reminder':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'warning')
      break

    case 'inventory_low_alert':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_INVENTORY_UPDATED', payload: true })
      showToast(notification.message, 'warning')
      break

    case 'admin_announcement':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      showToast(notification.message, 'info')
      break

    default:
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      break
  }
}

