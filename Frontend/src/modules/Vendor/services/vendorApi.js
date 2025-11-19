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
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }
  return response.json()
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
 * Vendor Login
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
 * POST /vendors/logout
 * 
 * @returns {Promise<Object>} - { message: 'Logged out successfully' }
 */
export async function logoutVendor() {
  return apiRequest('/vendors/logout', {
    method: 'POST',
  })
}

/**
 * Get Vendor Profile
 * GET /vendors/profile
 * 
 * @returns {Promise<Object>} - Vendor profile data
 */
export async function getVendorProfile() {
  return apiRequest('/vendors/profile')
}

// ============================================================================
// DASHBOARD & OVERVIEW APIs
// ============================================================================

/**
 * Get Vendor Dashboard Overview
 * GET /vendors/dashboard/overview
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          ordersToday: 12,
          urgentStock: 4,
          creditBalance: 1240000,
          creditDue: '08 Dec 2025',
          recentActivity: [
            { name: 'Farm Fresh Traders', action: 'Order accepted', amount: '+₹86,200', status: 'Completed', avatar: 'FF' },
            { name: 'Green Valley Hub', action: 'Loan repayment', amount: '-₹40,000', status: 'Pending', avatar: 'GV' },
            { name: 'HarvestLink Pvt Ltd', action: 'Delivery scheduled', amount: '+₹21,500', status: 'Scheduled', avatar: 'HL' },
          ],
          highlights: [
            { id: 'orders', label: 'Orders Today', value: 12, trend: '+3 vs yesterday' },
            { id: 'inventory', label: 'Urgent Stock', value: 4, trend: 'Items to restock' },
            { id: 'credit', label: 'Loan Balance', value: '₹12.4L', trend: 'Due in 8 days' },
          ],
        },
      })
    }, 800)
  })
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          message: 'Order accepted successfully',
          order: { id: orderId, status: 'processing' },
        },
      })
    }, 1000)
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
 * The backend should:
 * 1. Split the order into two parts:
 *    - Vendor fulfillment: Items accepted by vendor
 *    - Admin fulfillment: Items rejected/escalated to admin
 * 2. Create separate order tracking for each part
 * 3. Notify user about partial fulfillment
 * 4. Update vendor inventory for accepted items
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          message: 'Order partially accepted. Some items will be fulfilled by Admin.',
          vendorOrder: {
            id: `${orderId}-vendor`,
            parentOrderId: orderId,
            items: partialData.acceptedItems,
            status: 'processing',
            fulfillmentBy: 'vendor',
          },
          adminOrder: {
            id: `${orderId}-admin`,
            parentOrderId: orderId,
            items: partialData.rejectedItems,
            status: 'pending',
            fulfillmentBy: 'admin',
          },
          order: {
            id: orderId,
            status: 'partially_accepted',
            split: true,
          },
        },
      })
    }, 1000)
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          message: 'Order rejected and forwarded to Admin',
          order: { id: orderId, status: 'rejected', reason: reasonData.reason },
        },
      })
    }, 1000)
  })
}

/**
 * Update Order Status
 * PUT /vendors/orders/:orderId/status
 * 
 * IMPORTANT: This status update must be persisted and immediately reflected in the User Dashboard.
 * The backend should:
 * 1. Update the order status in the database
 * 2. Add an entry to the order's statusTimeline array with timestamp
 * 3. Notify the user via real-time notification (WebSocket/SSE) about the status change
 * 4. Make the updated status available via GET /users/orders/:orderId
 * 
 * @param {string} orderId - Order ID
 * @param {Object} statusData - { status: 'awaiting' | 'dispatched' | 'delivered', notes?: string }
 * @returns {Promise<Object>} - { message: 'Status updated', order: Object with statusTimeline }
 */
export async function updateOrderStatus(orderId, statusData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const now = new Date().toISOString()
      resolve({
        success: true,
        data: {
          message: 'Order status updated successfully',
          order: {
            id: orderId,
            status: statusData.status,
            notes: statusData.notes || '',
            updatedAt: now,
            statusTimeline: [
              { status: 'awaiting', timestamp: now },
              ...(statusData.status === 'dispatched' || statusData.status === 'delivered'
                ? [{ status: 'dispatched', timestamp: now }]
                : []),
              ...(statusData.status === 'delivered'
                ? [{ status: 'delivered', timestamp: now }]
                : []),
            ],
          },
        },
      })
    }, 1000)
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          items: [
            {
              id: 'inv-1',
              name: 'NPK 24:24:0',
              stock: 1240,
              stockUnit: 'kg',
              purchasePrice: 1050,
              sellingPrice: 1380,
              status: 'Healthy',
            },
            {
              id: 'inv-2',
              name: 'Urea Blend',
              stock: 640,
              stockUnit: 'kg',
              purchasePrice: 640,
              sellingPrice: 910,
              status: 'Low',
            },
            {
              id: 'inv-3',
              name: 'Micro Nutrients',
              stock: 210,
              stockUnit: 'kg',
              purchasePrice: 720,
              sellingPrice: 980,
              status: 'Critical',
            },
          ],
          total: 3,
          stats: {
            total: 3,
            healthy: 1,
            low: 1,
            critical: 1,
          },
        },
      })
    }, 600)
  })
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          message: 'Stock updated successfully',
          item: { id: itemId, stock: stockData.quantity },
        },
      })
    }, 1000)
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          limit: 3500000,
          used: 2260000,
          remaining: 1240000,
          penalty: 0,
          dueDate: '2025-12-08',
          repaymentDays: 30,
          penaltyRate: 0.5,
        },
      })
    }, 600)
  })
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      if (purchaseData.totalAmount < 50000) {
        resolve({
          success: false,
          error: { message: 'Minimum purchase value is ₹50,000' },
        })
      } else {
        resolve({
          success: true,
          data: {
            requestId: `CR-${Date.now()}`,
            message: 'Purchase request submitted successfully. Waiting for Admin approval.',
            status: 'pending',
          },
        })
      }
    }, 1500)
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
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          totalEarnings: 2860000,
          growth: 15.2,
          ordersThisWeek: 84,
          metrics: [
            { label: 'Orders this week', value: '84', meta: '+12% growth' },
            { label: 'Earnings this month', value: '₹18.6L', meta: 'Processing ₹4.2L' },
            { label: 'Loan purchases', value: '₹9.4L', meta: 'Across 3 requests' },
            { label: 'Customer satisfaction', value: '4.7/5', meta: 'Based on 156 reviews' },
          ],
          revenueData: {
            labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            revenue: [28.5, 32.8, 29.2, 35.6, 38.4, 34.1, 31.2],
            orders: [42, 48, 45, 52, 58, 50, 46],
          },
        },
      })
    }, 800)
  })
}

/**
 * Get Performance Analytics
 * GET /vendors/reports/performance
 * 
 * @param {Object} params - { period: 'week' | 'month' | 'year' }
 * @returns {Promise<Object>} - Performance metrics and charts data
 */
export async function getPerformanceAnalytics(params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/vendors/reports/performance?${queryParams}`)
}

/**
 * Get Region Analytics (20km coverage)
 * GET /vendors/reports/region
 * 
 * @returns {Promise<Object>} - Region-wise order and revenue analytics
 */
export async function getRegionAnalytics() {
  return apiRequest('/vendors/reports/region')
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

