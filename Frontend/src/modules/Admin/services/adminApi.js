/**
 * Admin API Service
 * 
 * This file contains all API endpoints for the Admin dashboard.
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
  const token = localStorage.getItem('admin_token') // Admin authentication token
  
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
 * Admin Login
 * POST /admin/login
 * 
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} - { token, admin: { id, name, email, role } }
 */
export async function loginAdmin(credentials) {
  // Simulate API call - replace with actual API call when backend is ready
  return new Promise((resolve) => {
    setTimeout(() => {
      if (credentials.email === 'admin@irasathi.com' && credentials.password === 'admin123') {
        resolve({
          success: true,
          data: {
            token: 'fake-admin-token',
            admin: {
              id: 'admin-001',
              name: 'Super Admin',
              email: credentials.email,
              role: 'super_admin',
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
 * Admin Logout
 * POST /admin/logout
 * 
 * @returns {Promise<Object>} - { message: 'Logged out successfully' }
 */
export async function logoutAdmin() {
  return apiRequest('/admin/logout', {
    method: 'POST',
  })
}

/**
 * Get Admin Profile
 * GET /admin/profile
 * 
 * @returns {Promise<Object>} - Admin profile data
 */
export async function getAdminProfile() {
  return apiRequest('/admin/profile')
}

// ============================================================================
// DASHBOARD APIs
// ============================================================================

/**
 * Get Dashboard Overview
 * GET /admin/dashboard
 * 
 * @param {Object} params - { period: 'day' | 'week' | 'month', region?: string }
 * @returns {Promise<Object>} - {
 *   headline: Array<{ id, title, value, subtitle, trend }>,
 *   payables: { advance, pending, outstanding },
 *   recentActivity: Array
 * }
 */
export async function getDashboardData(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          headline: [
            {
              id: 'users',
              title: 'Total Users',
              value: '52,480',
              subtitle: '+1,920 this month',
              trend: { direction: 'up', value: '3.8%', message: 'increase compared to last 30 days' },
            },
            {
              id: 'vendors',
              title: 'Verified Vendors',
              value: '324',
              subtitle: '18 pending approvals',
              trend: { direction: 'up', value: '6 new', message: 'new vendors approved' },
            },
            {
              id: 'orders',
              title: 'Orders (User + Vendor)',
              value: '3,140',
              subtitle: '78 issues waiting for review',
              trend: { direction: 'down', value: '1.2%', message: 'compared to last week' },
            },
            {
              id: 'revenue',
              title: 'Gross Revenue',
              value: '₹8.4 Cr',
              subtitle: 'Profit margin 21%',
              trend: { direction: 'up', value: '₹1.2 Cr', message: 'received this week' },
            },
          ],
          payables: {
            advance: '₹2.6 Cr',
            pending: '₹1.9 Cr',
            outstanding: '₹42.7 L',
          },
        },
      })
    }, 800)
  })
}

// ============================================================================
// PRODUCT MANAGEMENT APIs
// ============================================================================

/**
 * Get All Products
 * GET /admin/products
 * 
 * @param {Object} params - { region, status, search, limit, offset }
 * @returns {Promise<Object>} - { products: Array, total: number }
 */
export async function getProducts(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          products: [
            {
              id: 'NPK-24',
              name: 'NPK 24:24:0 Fertilizer',
              stock: 8450,
              stockUnit: 'kg',
              vendorPrice: 1050,
              userPrice: 1420,
              expiry: '2026-08-15',
              visibility: 'active',
              region: 'West',
            },
            {
              id: 'MICRO-12',
              name: 'Micro Nutrient Mix',
              stock: 2900,
              stockUnit: 'kg',
              vendorPrice: 720,
              userPrice: 990,
              expiry: '2025-01-20',
              visibility: 'warning',
              region: 'North',
            },
            {
              id: 'UREA-B',
              name: 'Stabilized Urea Blend',
              stock: 12300,
              stockUnit: 'kg',
              vendorPrice: 640,
              userPrice: 930,
              expiry: '2026-12-10',
              visibility: 'active',
              region: 'South',
            },
          ],
          total: 3,
        },
      })
    }, 600)
  })
}

/**
 * Get Product Details
 * GET /admin/products/:productId
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - Detailed product information
 */
export async function getProductDetails(productId) {
  return apiRequest(`/admin/products/${productId}`)
}

/**
 * Create Product
 * POST /admin/products
 * 
 * @param {Object} productData - {
 *   name: string,
 *   vendorPrice: number,
 *   userPrice: number,
 *   stock: number,
 *   stockUnit: string,
 *   expiry: string,
 *   region: string,
 *   visibility: 'active' | 'inactive'
 * }
 * @returns {Promise<Object>} - { product: Object, message: string }
 */
export async function createProduct(productData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          product: { id: `PROD-${Date.now()}`, ...productData },
          message: 'Product created successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Update Product
 * PUT /admin/products/:productId
 * 
 * @param {string} productId - Product ID
 * @param {Object} productData - Product data to update
 * @returns {Promise<Object>} - { product: Object, message: string }
 */
export async function updateProduct(productId, productData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          product: { id: productId, ...productData },
          message: 'Product updated successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Delete Product
 * DELETE /admin/products/:productId
 * 
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteProduct(productId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Product deleted successfully' },
      })
    }, 1000)
  })
}

/**
 * Assign Product to Vendor
 * POST /admin/products/:productId/assign
 * 
 * @param {string} productId - Product ID
 * @param {Object} assignmentData - { vendorId: string, region: string, quantity?: number }
 * @returns {Promise<Object>} - { message: string }
 */
export async function assignProductToVendor(productId, assignmentData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Product assigned to vendor successfully' },
      })
    }, 1000)
  })
}

/**
 * Toggle Product Visibility
 * PUT /admin/products/:productId/visibility
 * 
 * @param {string} productId - Product ID
 * @param {Object} visibilityData - { visibility: 'active' | 'inactive' }
 * @returns {Promise<Object>} - { product: Object, message: string }
 */
export async function toggleProductVisibility(productId, visibilityData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          product: { id: productId, visibility: visibilityData.visibility },
          message: 'Product visibility updated successfully',
        },
      })
    }, 1000)
  })
}

// ============================================================================
// VENDOR MANAGEMENT APIs
// ============================================================================

/**
 * Get All Vendors
 * GET /admin/vendors
 * 
 * @param {Object} params - { status, region, search, limit, offset }
 * @returns {Promise<Object>} - { vendors: Array, total: number }
 */
export async function getVendors(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          vendors: [
            {
              id: 'VND-204',
              name: 'GreenGrow Supplies',
              region: 'Gujarat',
              location: { lat: 23.0225, lng: 72.5714 },
              creditLimit: 3500000,
              repaymentDays: 21,
              penaltyRate: 1.5,
              status: 'on_track',
              dues: 840000,
            },
            {
              id: 'VND-131',
              name: 'HarvestLink Pvt Ltd',
              region: 'Maharashtra',
              location: { lat: 19.0760, lng: 72.8777 },
              creditLimit: 6000000,
              repaymentDays: 28,
              penaltyRate: 2.0,
              status: 'delayed',
              dues: 1960000,
            },
            {
              id: 'VND-412',
              name: 'GrowSure Traders',
              region: 'Rajasthan',
              location: { lat: 26.9124, lng: 75.7873 },
              creditLimit: 2500000,
              repaymentDays: 18,
              penaltyRate: 1.0,
              status: 'review',
              dues: 620000,
            },
          ],
          total: 3,
        },
      })
    }, 600)
  })
}

/**
 * Get Vendor Details
 * GET /admin/vendors/:vendorId
 * 
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} - Detailed vendor information
 */
export async function getVendorDetails(vendorId) {
  return apiRequest(`/admin/vendors/${vendorId}`)
}

/**
 * Approve Vendor Application
 * POST /admin/vendors/:vendorId/approve
 * 
 * @param {string} vendorId - Vendor ID
 * @param {Object} approvalData - { creditLimit, repaymentDays, penaltyRate }
 * @returns {Promise<Object>} - { vendor: Object, message: string }
 */
export async function approveVendor(vendorId, approvalData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          vendor: { id: vendorId, status: 'approved', ...approvalData },
          message: 'Vendor approved successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Reject Vendor Application
 * POST /admin/vendors/:vendorId/reject
 * 
 * @param {string} vendorId - Vendor ID
 * @param {Object} rejectionData - { reason: string }
 * @returns {Promise<Object>} - { message: string }
 */
export async function rejectVendor(vendorId, rejectionData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Vendor application rejected' },
      })
    }, 1000)
  })
}

/**
 * Update Vendor Credit Policy
 * PUT /admin/vendors/:vendorId/credit-policy
 * 
 * @param {string} vendorId - Vendor ID
 * @param {Object} policyData - { creditLimit, repaymentDays, penaltyRate }
 * @returns {Promise<Object>} - { vendor: Object, message: string }
 */
export async function updateVendorCreditPolicy(vendorId, policyData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          vendor: { id: vendorId, ...policyData },
          message: 'Credit policy updated successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Approve Vendor Purchase Request
 * POST /admin/vendors/purchases/:requestId/approve
 * 
 * @param {string} requestId - Purchase request ID
 * @returns {Promise<Object>} - { message: string, purchase: Object }
 */
export async function approveVendorPurchase(requestId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          message: 'Purchase request approved successfully',
          purchase: { id: requestId, status: 'approved' },
        },
      })
    }, 1000)
  })
}

/**
 * Reject Vendor Purchase Request
 * POST /admin/vendors/purchases/:requestId/reject
 * 
 * @param {string} requestId - Purchase request ID
 * @param {Object} rejectionData - { reason: string }
 * @returns {Promise<Object>} - { message: string }
 */
export async function rejectVendorPurchase(requestId, rejectionData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Purchase request rejected' },
      })
    }, 1000)
  })
}

/**
 * Get Vendor Purchase Requests
 * GET /admin/vendors/purchases
 * 
 * @param {Object} params - { status, vendorId, limit, offset }
 * @returns {Promise<Object>} - { purchases: Array, total: number }
 */
export async function getVendorPurchaseRequests(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          purchases: [
            {
              id: 'CR-123',
              requestId: 'CR-123',
              vendorId: 'VND-131',
              vendor: 'HarvestLink Pvt Ltd',
              vendorName: 'HarvestLink Pvt Ltd',
              amount: 500000,
              value: 500000,
              date: '2024-01-15',
              status: 'pending',
              description: 'Bulk purchase request for NPK fertilizers',
              products: [
                { name: 'NPK 24:24:0 Fertilizer', quantity: 500 },
                { name: 'Micro Nutrient Mix', quantity: 200 },
              ],
              documents: ['Purchase Order.pdf', 'Credit Application.pdf'],
              vendorPerformance: {
                creditUtilization: 78,
                repaymentHistory: 'On Time',
              },
            },
            {
              id: 'CR-124',
              requestId: 'CR-124',
              vendorId: 'VND-204',
              vendor: 'GreenGrow Supplies',
              vendorName: 'GreenGrow Supplies',
              amount: 750000,
              value: 750000,
              date: '2024-01-16',
              status: 'pending',
              description: 'Quarterly stock replenishment',
              products: [
                { name: 'Stabilized Urea Blend', quantity: 800 },
              ],
              documents: ['PO-2024-Q1.pdf'],
              vendorPerformance: {
                creditUtilization: 65,
                repaymentHistory: 'On Time',
              },
            },
          ],
          total: 2,
        },
      })
    }, 600)
  })
}

// ============================================================================
// SELLER MANAGEMENT APIs
// ============================================================================

/**
 * Get All Sellers
 * GET /admin/sellers
 * 
 * @param {Object} params - { status, search, limit, offset }
 * @returns {Promise<Object>} - { sellers: Array, total: number }
 */
export async function getSellers(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          sellers: [
            {
              id: 'SLR-883',
              sellerId: 'SLR-883',
              name: 'Priya Nair',
              cashbackRate: 2.5,
              commissionRate: 5.0,
              monthlyTarget: 3200000,
              achieved: 2160000,
              progress: 68,
              referrals: 212,
              totalSales: 2160000,
              status: 'on_track',
            },
            {
              id: 'SLR-552',
              sellerId: 'SLR-552',
              name: 'Sahil Mehta',
              cashbackRate: 1.8,
              commissionRate: 4.0,
              monthlyTarget: 2800000,
              achieved: 1520000,
              progress: 54,
              referrals: 148,
              totalSales: 1520000,
              status: 'needs_attention',
            },
          ],
          total: 2,
        },
      })
    }, 600)
  })
}

/**
 * Get Seller Details
 * GET /admin/sellers/:sellerId
 * 
 * @param {string} sellerId - Seller ID
 * @returns {Promise<Object>} - Detailed seller information
 */
export async function getSellerDetails(sellerId) {
  return apiRequest(`/admin/sellers/${sellerId}`)
}

/**
 * Create Seller
 * POST /admin/sellers
 * 
 * @param {Object} sellerData - {
 *   name: string,
 *   email: string,
 *   phone: string,
 *   area: string,
 *   cashbackRate: number,
 *   commissionRate: number,
 *   monthlyTarget: number
 * }
 * @returns {Promise<Object>} - { seller: Object, message: string }
 */
export async function createSeller(sellerData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const sellerId = `SLR-${Math.floor(Math.random() * 1000)}`
      resolve({
        success: true,
        data: {
          seller: { id: `seller-${Date.now()}`, sellerId, ...sellerData },
          message: 'Seller created successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Update Seller
 * PUT /admin/sellers/:sellerId
 * 
 * @param {string} sellerId - Seller ID
 * @param {Object} sellerData - Seller data to update
 * @returns {Promise<Object>} - { seller: Object, message: string }
 */
export async function updateSeller(sellerId, sellerData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          seller: { id: sellerId, ...sellerData },
          message: 'Seller updated successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Delete Seller
 * DELETE /admin/sellers/:sellerId
 * 
 * @param {string} sellerId - Seller ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteSeller(sellerId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Seller deleted successfully' },
      })
    }, 1000)
  })
}

/**
 * Approve Seller Withdrawal
 * POST /admin/sellers/withdrawals/:requestId/approve
 * 
 * @param {string} requestId - Withdrawal request ID
 * @returns {Promise<Object>} - { message: string, withdrawal: Object }
 */
export async function approveSellerWithdrawal(requestId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          message: 'Withdrawal approved successfully',
          withdrawal: { id: requestId, status: 'approved' },
        },
      })
    }, 1000)
  })
}

/**
 * Reject Seller Withdrawal
 * POST /admin/sellers/withdrawals/:requestId/reject
 * 
 * @param {string} requestId - Withdrawal request ID
 * @param {Object} rejectionData - { reason: string }
 * @returns {Promise<Object>} - { message: string }
 */
export async function rejectSellerWithdrawal(requestId, rejectionData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Withdrawal request rejected' },
      })
    }, 1000)
  })
}

/**
 * Get Seller Withdrawal Requests
 * GET /admin/sellers/withdrawals
 * 
 * @param {Object} params - { status, sellerId, limit, offset }
 * @returns {Promise<Object>} - { withdrawals: Array, total: number }
 */
export async function getSellerWithdrawalRequests(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          withdrawals: [
            {
              id: 'WD-456',
              requestId: 'WD-456',
              sellerId: 'SLR-883',
              seller: { name: 'Priya Nair', sellerId: 'SLR-883' },
              sellerName: 'Priya Nair',
              amount: 25000,
              date: '2024-01-15',
              status: 'pending',
              reason: 'Monthly earnings withdrawal',
              bankDetails: {
                accountNumber: '****1234',
                ifsc: 'HDFC0001234',
                bankName: 'HDFC Bank',
              },
              sellerPerformance: {
                totalSales: 2160000,
                pendingEarnings: 125000,
                targetAchievement: 68,
              },
            },
            {
              id: 'WD-457',
              requestId: 'WD-457',
              sellerId: 'SLR-552',
              seller: { name: 'Sahil Mehta', sellerId: 'SLR-552' },
              sellerName: 'Sahil Mehta',
              amount: 18000,
              date: '2024-01-16',
              status: 'pending',
              reason: 'Partial withdrawal',
              bankDetails: {
                accountNumber: '****5678',
                ifsc: 'ICIC0005678',
                bankName: 'ICICI Bank',
              },
              sellerPerformance: {
                totalSales: 1520000,
                pendingEarnings: 85000,
                targetAchievement: 54,
              },
            },
          ],
          total: 2,
        },
      })
    }, 600)
  })
}

// ============================================================================
// USER MANAGEMENT APIs
// ============================================================================

/**
 * Get All Users
 * GET /admin/users
 * 
 * @param {Object} params - { status, region, sellerId, search, limit, offset }
 * @returns {Promise<Object>} - { users: Array, total: number }
 */
export async function getUsers(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          users: [
            {
              id: 'USR-6621',
              name: 'Anand Kumar',
              phone: '+91 9876543210',
              region: 'Surat',
              sellerId: 'SLR-883',
              orders: 12,
              payments: 'on_time',
              supportTickets: 0,
              status: 'active',
            },
            {
              id: 'USR-9842',
              name: 'Mita Shah',
              phone: '+91 9876543211',
              region: 'Ahmedabad',
              sellerId: 'SLR-552',
              orders: 5,
              payments: 'delayed',
              supportTickets: 2,
              status: 'review',
            },
          ],
          total: 2,
        },
      })
    }, 600)
  })
}

/**
 * Get User Details
 * GET /admin/users/:userId
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Detailed user information including orders, payments, support tickets
 */
export async function getUserDetails(userId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          id: userId,
          name: userId === 'USR-6621' ? 'Anand Kumar' : 'Mita Shah',
          phone: userId === 'USR-6621' ? '+91 9876543210' : '+91 9876543211',
          region: userId === 'USR-6621' ? 'Surat' : 'Ahmedabad',
          sellerId: userId === 'USR-6621' ? 'SLR-883' : 'SLR-552',
          orders: userId === 'USR-6621' ? 12 : 5,
          payments: userId === 'USR-6621' ? 'on_time' : 'delayed',
          supportTickets: userId === 'USR-6621' ? 0 : 2,
          status: userId === 'USR-6621' ? 'active' : 'review',
          ordersHistory: [
            {
              id: 'ORD-001',
              value: 15000,
              date: '2024-01-10',
              status: 'completed',
            },
            {
              id: 'ORD-002',
              value: 22000,
              date: '2024-01-15',
              status: 'pending',
            },
          ],
          paymentHistory: [
            {
              id: 'PAY-001',
              amount: 15000,
              date: '2024-01-10',
              description: 'Payment for Order ORD-001',
              status: 'completed',
            },
            {
              id: 'PAY-002',
              amount: 22000,
              date: '2024-01-15',
              description: 'Payment for Order ORD-002',
              status: 'pending',
            },
          ],
          supportTickets: userId === 'USR-6621' ? [] : [
            {
              id: 'TKT-001',
              ticketId: 'TKT-001',
              subject: 'Order delivery issue',
              description: 'Order #ORD-12345 was not delivered on time. Need assistance.',
              status: 'open',
              createdAt: '2024-01-15',
              conversation: [
                { from: 'User', message: 'Order #ORD-12345 was not delivered on time. Need assistance.', timestamp: '2024-01-15 10:00' },
                { from: 'Admin', message: 'We are looking into this issue. Will update you soon.', timestamp: '2024-01-15 11:30' },
              ],
            },
            {
              id: 'TKT-002',
              ticketId: 'TKT-002',
              subject: 'Product quality concern',
              description: 'Received product does not match the description.',
              status: 'open',
              createdAt: '2024-01-16',
              conversation: [
                { from: 'User', message: 'Received product does not match the description.', timestamp: '2024-01-16 09:00' },
              ],
            },
          ],
        },
      })
    }, 600)
  })
}

/**
 * Block User
 * POST /admin/users/:userId/block
 * 
 * @param {string} userId - User ID
 * @param {Object} blockData - { reason: string }
 * @returns {Promise<Object>} - { message: string }
 */
export async function blockUser(userId, blockData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'User blocked successfully' },
      })
    }, 1000)
  })
}

/**
 * Deactivate User
 * POST /admin/users/:userId/deactivate
 * 
 * @param {string} userId - User ID
 * @param {Object} deactivateData - { reason: string }
 * @returns {Promise<Object>} - { message: string }
 */
export async function deactivateUser(userId, deactivateData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'User deactivated successfully' },
      })
    }, 1000)
  })
}

/**
 * Activate User
 * POST /admin/users/:userId/activate
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function activateUser(userId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'User activated successfully' },
      })
    }, 1000)
  })
}

// ============================================================================
// ORDER MANAGEMENT APIs
// ============================================================================

/**
 * Get All Orders
 * GET /admin/orders
 * 
 * @param {Object} params - { type, region, vendorId, status, dateFrom, dateTo, limit, offset }
 * @returns {Promise<Object>} - { orders: Array, total: number }
 */
export async function getOrders(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          orders: [
            {
              id: 'ORD-78234',
              type: 'vendor',
              vendorId: 'VND-131',
              vendor: 'HarvestLink Pvt Ltd',
              region: 'Maharashtra',
              value: 5840000,
              advance: 1752000,
              advanceStatus: 'paid',
              pending: 4088000,
              status: 'processing',
            },
            {
              id: 'ORD-78289',
              type: 'user',
              vendorId: 'VND-204',
              vendor: 'GreenGrow Supplies',
              region: 'Gujarat',
              value: 180000,
              advance: 54000,
              advanceStatus: 'pending',
              pending: 126000,
              status: 'awaiting_dispatch',
            },
          ],
          total: 2,
        },
      })
    }, 600)
  })
}

/**
 * Get Order Details
 * GET /admin/orders/:orderId
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - Detailed order information
 */
export async function getOrderDetails(orderId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const isVendorOrder = orderId === 'ORD-78234'
      resolve({
        success: true,
        data: {
          id: orderId,
          type: isVendorOrder ? 'Vendor' : 'User',
          vendorId: isVendorOrder ? 'VND-131' : 'VND-204',
          vendor: isVendorOrder ? 'HarvestLink Pvt Ltd' : 'GreenGrow Supplies',
          region: isVendorOrder ? 'Maharashtra' : 'Gujarat',
          date: '2024-01-15',
          value: isVendorOrder ? 5840000 : 180000,
          advance: isVendorOrder ? 1752000 : 0,
          advanceStatus: isVendorOrder ? 'paid' : 'pending',
          pending: isVendorOrder ? 4088000 : 180000,
          status: isVendorOrder ? 'Processing' : 'Awaiting Dispatch',
          items: [
            {
              id: 'ITEM-001',
              name: 'NPK 24:24:0 Fertilizer',
              quantity: isVendorOrder ? 500 : 10,
              unit: 'bags',
              price: isVendorOrder ? 11680 : 18000,
            },
            {
              id: 'ITEM-002',
              name: 'Micro Nutrient Mix',
              quantity: isVendorOrder ? 200 : 0,
              unit: 'bags',
              price: isVendorOrder ? 5000 : 0,
            },
          ],
          paymentHistory: [
            {
              id: 'PAY-001',
              type: 'Advance Payment',
              amount: isVendorOrder ? 1752000 : 0,
              date: isVendorOrder ? '2024-01-15' : null,
              status: isVendorOrder ? 'completed' : 'pending',
            },
            {
              id: 'PAY-002',
              type: 'Remaining Payment',
              amount: isVendorOrder ? 4088000 : 180000,
              date: null,
              status: 'pending',
            },
          ],
          refunds: isVendorOrder ? [] : [
            {
              id: 'REF-001',
              amount: 5000,
              reason: 'Product quality issue',
              status: 'pending',
            },
          ],
          escalated: !isVendorOrder,
          escalationReason: !isVendorOrder ? 'Payment delay and quality concerns' : null,
        },
      })
    }, 600)
  })
}

/**
 * Reassign Order
 * POST /admin/orders/:orderId/reassign
 * 
 * @param {string} orderId - Order ID
 * @param {Object} reassignData - { vendorId: string, reason?: string }
 * @returns {Promise<Object>} - { message: string, order: Object }
 */
export async function reassignOrder(orderId, reassignData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          message: 'Order reassigned successfully',
          order: { id: orderId, vendorId: reassignData.vendorId },
        },
      })
    }, 1000)
  })
}

/**
 * Generate Invoice
 * POST /admin/orders/:orderId/invoice
 * 
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} - { invoiceUrl: string, invoiceId: string }
 */
export async function generateInvoice(orderId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          invoiceUrl: `/invoices/${orderId}.pdf`,
          invoiceId: `INV-${orderId}`,
        },
      })
    }, 1000)
  })
}

// ============================================================================
// FINANCE & CREDIT MANAGEMENT APIs
// ============================================================================

/**
 * Get Finance Overview
 * GET /admin/finance
 * 
 * @returns {Promise<Object>} - {
 *   creditPolicies: Array,
 *   outstandingCredits: Array,
 *   totalOutstanding: number,
 *   recoveryStatus: Object
 * }
 */
export async function getFinanceData() {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          creditPolicies: [
            { id: 'advance', label: 'Advance %', value: '30%', meta: 'Default advance for all vendors' },
            { id: 'user-min', label: 'Minimum User Order', value: '₹2,000', meta: 'Effective since Apr 2024' },
            { id: 'vendor-min', label: 'Minimum Vendor Purchase', value: '₹50,000', meta: 'Applies to all vendor types' },
          ],
          outstandingCredits: [
            { label: 'Total Outstanding', progress: 72, tone: 'warning', meta: '₹1.92 Cr in recovery process' },
            { label: 'Current Cycle Recovery', progress: 54, tone: 'success', meta: '₹82 L collected this week' },
            { label: 'Delayed Accounts', progress: 28, meta: '14 vendors flagged for follow-up' },
          ],
          totalOutstanding: 19200000,
          recoveryStatus: {
            total: 19200000,
            collected: 8200000,
            pending: 11000000,
          },
        },
      })
    }, 600)
  })
}

/**
 * Get Financial Parameters
 * GET /admin/finance/parameters
 * 
 * @returns {Promise<Object>} - { userAdvancePaymentPercent, minimumUserOrder, minimumVendorPurchase }
 */
export async function getFinancialParameters() {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          userAdvancePaymentPercent: 30,
          minimumUserOrder: 2000,
          minimumVendorPurchase: 50000,
        },
      })
    }, 600)
  })
}

/**
 * Update Financial Parameters
 * PUT /admin/finance/parameters
 * 
 * @param {Object} parameters - {
 *   userAdvancePaymentPercent: number,
 *   minimumUserOrder: number,
 *   minimumVendorPurchase: number
 * }
 * @returns {Promise<Object>} - { parameters: Object, message: string }
 */
export async function updateFinancialParameters(parameters) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          parameters,
          message: 'Financial parameters updated successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Get Vendor Credit Balances
 * GET /admin/finance/vendor-credits
 * 
 * @param {Object} params - { vendorId }
 * @returns {Promise<Object>} - { credits: Array, creditData: Object }
 */
export async function getVendorCreditBalances(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      if (params.vendorId) {
        // Return detailed credit data for a specific vendor
        resolve({
          success: true,
          data: {
            creditData: {
              creditLimit: 5000000,
              usedCredit: 3900000,
              availableCredit: 1100000,
              overdueAmount: 500000,
              penaltyAmount: 0,
              repaymentHistory: [
                {
                  id: 'PAY-001',
                  amount: 1000000,
                  date: '2024-01-10',
                  description: 'Repayment for Order ORD-78234',
                  status: 'completed',
                  onTime: true,
                },
                {
                  id: 'PAY-002',
                  amount: 500000,
                  date: '2024-01-15',
                  description: 'Partial repayment',
                  status: 'completed',
                  onTime: false,
                },
              ],
              overduePayments: [
                {
                  id: 'OVERDUE-001',
                  amount: 500000,
                  description: 'Overdue payment for Order ORD-78234',
                  dueDate: '2024-01-20',
                  daysOverdue: 5,
                  penaltyApplied: false,
                },
              ],
            },
          },
        })
      } else {
        // Return list of all vendor credits
        resolve({
          success: true,
          data: {
            credits: [
              {
                id: 'VND-131',
                name: 'HarvestLink Pvt Ltd',
                creditLimit: 5000000,
                usedCredit: 3900000,
                overdue: 500000,
                penalty: 0,
                status: 'warning',
              },
              {
                id: 'VND-204',
                name: 'GreenGrow Supplies',
                creditLimit: 3000000,
                usedCredit: 1500000,
                overdue: 0,
                penalty: 0,
                status: 'success',
              },
            ],
          },
        })
      }
    }, 600)
  })
}

/**
 * Apply Penalty
 * POST /admin/finance/vendors/:vendorId/penalty
 * 
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function applyPenalty(vendorId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Penalty applied successfully' },
      })
    }, 1000)
  })
}

/**
 * Get Outstanding Credits
 * GET /admin/finance/outstanding-credits
 * 
 * @returns {Promise<Object>} - { credits: Array }
 */
export async function getOutstandingCredits() {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          credits: [
            { label: 'Total Outstanding', progress: 72, tone: 'warning', meta: '₹1.92 Cr in recovery process' },
            { label: 'Current Cycle Recovery', progress: 54, tone: 'success', meta: '₹82 L collected this week' },
            { label: 'Delayed Accounts', progress: 28, meta: '14 vendors flagged for follow-up' },
          ],
        },
      })
    }, 600)
  })
}

/**
 * Get Recovery Status
 * GET /admin/finance/recovery-status
 * 
 * @returns {Promise<Object>} - { recoveries: Array }
 */
export async function getRecoveryStatus() {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          recoveries: [
            {
              id: 'REC-001',
              title: 'Total Outstanding Recovery',
              description: '₹1.92 Cr in recovery process',
              amount: 19200000,
              progress: 72,
              status: 'in_progress',
              vendorCount: 14,
            },
            {
              id: 'REC-002',
              title: 'Current Cycle Recovery',
              description: '₹82 L collected this week',
              amount: 8200000,
              progress: 54,
              status: 'in_progress',
              vendorCount: 8,
            },
            {
              id: 'REC-003',
              title: 'Delayed Accounts',
              description: '14 vendors flagged for follow-up',
              amount: 5000000,
              progress: 28,
              status: 'overdue',
              vendorCount: 14,
            },
          ],
        },
      })
    }, 600)
  })
}

/**
 * Apply Penalty to Vendor
 * POST /admin/finance/vendors/:vendorId/penalty
 * 
 * @param {string} vendorId - Vendor ID
 * @param {Object} penaltyData - { amount: number, reason: string }
 * @returns {Promise<Object>} - { message: string }
 */
export async function applyVendorPenalty(vendorId, penaltyData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Penalty applied successfully' },
      })
    }, 1000)
  })
}

// ============================================================================
// OPERATIONAL CONTROLS APIs
// ============================================================================

/**
 * Get Logistics Settings
 * GET /admin/operations/logistics-settings
 * 
 * @returns {Promise<Object>} - { defaultDeliveryTime, availableDeliveryOptions, ... }
 */
export async function getLogisticsSettings() {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          defaultDeliveryTime: '4h',
          availableDeliveryOptions: ['3h', '4h', '1d'],
          enableExpressDelivery: true,
          enableStandardDelivery: true,
          enableNextDayDelivery: true,
        },
      })
    }, 600)
  })
}

/**
 * Update Logistics Settings
 * PUT /admin/operations/logistics-settings
 * 
 * @param {Object} settings - Logistics settings object
 * @returns {Promise<Object>} - { settings: Object, message: string }
 */
export async function updateLogisticsSettings(settings) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          settings,
          message: 'Logistics settings updated successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Get Escalated Orders
 * GET /admin/operations/escalated-orders
 * 
 * @returns {Promise<Object>} - { orders: Array }
 */
export async function getEscalatedOrders() {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          orders: [
            {
              id: 'ORD-78289',
              vendor: 'GreenGrow Supplies',
              vendorId: 'VND-204',
              value: 180000,
              orderValue: 180000,
              escalatedAt: '2024-01-16 10:30',
              status: 'escalated',
              items: [
                { id: 'ITEM-001', name: 'NPK 24:24:0 Fertilizer', quantity: 10, price: 18000 },
              ],
            },
          ],
        },
      })
    }, 600)
  })
}

/**
 * Fulfill Order from Warehouse
 * POST /admin/operations/orders/:orderId/fulfill-warehouse
 * 
 * @param {string} orderId - Order ID
 * @param {Object} fulfillmentData - { note: string }
 * @returns {Promise<Object>} - { message: string, order: Object }
 */
export async function fulfillOrderFromWarehouse(orderId, fulfillmentData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          message: 'Order fulfilled from warehouse successfully',
          order: { id: orderId, status: 'processing' },
        },
      })
    }, 1000)
  })
}

/**
 * Get Notifications
 * GET /admin/operations/notifications
 * 
 * @returns {Promise<Object>} - { notifications: Array }
 */
export async function getNotifications() {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          notifications: [
            {
              id: 'NOTIF-001',
              title: 'New Product Launch',
              message: 'We are excited to announce new fertilizer products available now!',
              targetAudience: 'all',
              priority: 'high',
              isActive: true,
              createdAt: '2024-01-15',
            },
            {
              id: 'NOTIF-002',
              title: 'Payment Policy Update',
              message: 'Updated payment terms for vendors. Please review the new credit policy.',
              targetAudience: 'vendors',
              priority: 'normal',
              isActive: true,
              createdAt: '2024-01-14',
            },
            {
              id: 'NOTIF-003',
              title: 'Seller Commission Update',
              message: 'New commission rates effective from next month.',
              targetAudience: 'sellers',
              priority: 'normal',
              isActive: false,
              createdAt: '2024-01-13',
            },
          ],
        },
      })
    }, 600)
  })
}

/**
 * Create Notification
 * POST /admin/operations/notifications
 * 
 * @param {Object} notificationData - Notification object
 * @returns {Promise<Object>} - { notification: Object, message: string }
 */
export async function createNotification(notificationData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          notification: {
            id: `NOTIF-${Date.now()}`,
            ...notificationData,
            createdAt: new Date().toISOString().split('T')[0],
          },
          message: 'Notification created successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Update Notification
 * PUT /admin/operations/notifications/:notificationId
 * 
 * @param {string} notificationId - Notification ID
 * @param {Object} notificationData - Updated notification object
 * @returns {Promise<Object>} - { notification: Object, message: string }
 */
export async function updateNotification(notificationId, notificationData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          notification: {
            id: notificationId,
            ...notificationData,
          },
          message: 'Notification updated successfully',
        },
      })
    }, 1000)
  })
}

/**
 * Delete Notification
 * DELETE /admin/operations/notifications/:notificationId
 * 
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} - { message: string }
 */
export async function deleteNotification(notificationId) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: { message: 'Notification deleted successfully' },
      })
    }, 1000)
  })
}

/**
 * Get Vendor Credit History
 * GET /admin/finance/vendors/:vendorId/history
 * 
 * @param {string} vendorId - Vendor ID
 * @param {Object} params - { limit, offset, startDate, endDate }
 * @returns {Promise<Object>} - { transactions: Array, total: number }
 */
export async function getVendorCreditHistory(vendorId, params = {}) {
  const queryParams = new URLSearchParams(params).toString()
  return apiRequest(`/admin/finance/vendors/${vendorId}/history?${queryParams}`)
}

// ============================================================================
// ANALYTICS & REPORTS APIs
// ============================================================================

/**
 * Get Analytics Data
 * GET /admin/analytics
 * 
 * @param {Object} params - { period: 'day' | 'week' | 'month' | 'year', region?: string }
 * @returns {Promise<Object>} - {
 *   highlights: Array,
 *   timeline: Array,
 *   regionWise: Array,
 *   topVendors: Array,
 *   topSellers: Array
 * }
 */
export async function getAnalyticsData(params = {}) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          highlights: [
            { label: 'Total Orders', value: '3,140', change: '+12%' },
            { label: 'Total Revenue', value: '₹8.4 Cr', change: '+9.6%' },
            { label: 'Top Region', value: 'Gujarat', change: '₹2.1 Cr' },
            { label: 'Top Vendor', value: 'HarvestLink Pvt Ltd', change: '₹1.4 Cr' },
          ],
          timeline: [
            {
              id: 'event-1',
              title: 'Vendor payment review completed',
              timestamp: 'Today, 09:30',
              description: '14 vendors moved back to On Track status after payment verification.',
              status: 'completed',
            },
            {
              id: 'event-2',
              title: 'Monthly seller rankings published',
              timestamp: 'Yesterday, 18:05',
              description: 'Rankings shared with rewards for top performers.',
              status: 'completed',
            },
            {
              id: 'event-3',
              title: 'Delivery delay alert',
              timestamp: 'Yesterday, 11:40',
              description: 'Western region facing 18h delay due to local strikes. Backup plan activated.',
              status: 'pending',
            },
          ],
          regionWise: [
            { region: 'Gujarat', orders: 1240, revenue: 21000000 },
            { region: 'Maharashtra', orders: 980, revenue: 16800000 },
            { region: 'Rajasthan', orders: 920, revenue: 14200000 },
          ],
          topVendors: [
            { name: 'HarvestLink Pvt Ltd', revenue: 14000000, change: '+12%' },
            { name: 'GreenGrow Supplies', revenue: 11000000, change: '+9%' },
            { name: 'GrowSure Traders', revenue: 8200000, change: '+4%' },
          ],
          topSellers: [
            { name: 'Priya Nair', sales: 2160000, referrals: 212 },
            { name: 'Sahil Mehta', sales: 1520000, referrals: 148 },
          ],
        },
      })
    }, 800)
  })
}

/**
 * Export Reports
 * POST /admin/analytics/export
 * 
 * @param {Object} exportData - {
 *   format: 'excel' | 'pdf',
 *   period: 'day' | 'week' | 'month' | 'year',
 *   type: 'orders' | 'revenue' | 'vendors' | 'sellers' | 'all'
 * }
 * @returns {Promise<Object>} - { downloadUrl: string, reportId: string }
 */
export async function exportReports(exportData) {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        data: {
          downloadUrl: `/reports/export-${Date.now()}.${exportData.format === 'excel' ? 'xlsx' : 'pdf'}`,
          reportId: `RPT-${Date.now()}`,
        },
      })
    }, 2000)
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
        type: 'vendor_application',
        title: 'New Vendor Application',
        message: 'New vendor application received from Green Valley Hub',
        timestamp: new Date().toISOString(),
        data: { vendorId: 'VND-500', vendorName: 'Green Valley Hub' },
      },
      {
        type: 'vendor_purchase_request',
        title: 'Vendor Purchase Request',
        message: 'HarvestLink Pvt Ltd requested credit purchase of ₹50,000',
        timestamp: new Date().toISOString(),
        data: { requestId: 'CR-123', vendorId: 'VND-131', amount: 50000 },
      },
      {
        type: 'seller_withdrawal_request',
        title: 'Seller Withdrawal Request',
        message: 'Priya Nair requested withdrawal of ₹25,000',
        timestamp: new Date().toISOString(),
        data: { requestId: 'WD-456', sellerId: 'SLR-883', amount: 25000 },
      },
      {
        type: 'order_escalated',
        title: 'Order Escalated',
        message: 'Order #ORD-78289 escalated to Admin for fulfillment',
        timestamp: new Date().toISOString(),
        data: { orderId: 'ORD-78289', reason: 'Vendor unavailable' },
      },
      {
        type: 'payment_delayed',
        title: 'Payment Delayed',
        message: '14 vendors have delayed payments requiring attention',
        timestamp: new Date().toISOString(),
        data: { count: 14 },
      },
      {
        type: 'low_stock_alert',
        title: 'Low Stock Alert',
        message: 'Micro Nutrient Mix stock is running low (2,900 kg)',
        timestamp: new Date().toISOString(),
        data: { productId: 'MICRO-12', productName: 'Micro Nutrient Mix', stock: 2900 },
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
    case 'vendor_application':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_VENDORS_UPDATED', payload: true })
      showToast(notification.message, 'info')
      break

    case 'vendor_purchase_request':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
      showToast(notification.message, 'info')
      break

    case 'seller_withdrawal_request':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_SELLERS_UPDATED', payload: true })
      showToast(notification.message, 'info')
      break

    case 'order_escalated':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_ORDERS_UPDATED', payload: true })
      showToast(notification.message, 'warning')
      break

    case 'payment_delayed':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_FINANCE_UPDATED', payload: true })
      showToast(notification.message, 'warning')
      break

    case 'low_stock_alert':
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      dispatch({ type: 'SET_PRODUCTS_UPDATED', payload: true })
      showToast(notification.message, 'warning')
      break

    default:
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
      break
  }
}

