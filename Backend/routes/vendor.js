const express = require('express');
const router = express.Router();

// Import controllers and middleware
const vendorController = require('../controllers/vendorController');
const vendorAdminMessageController = require('../controllers/vendorAdminMessageController');
const { authorizeVendor } = require('../middleware/auth');

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * @route   POST /api/vendors/auth/register
 * @desc    Vendor registration
 * @access  Public
 */
router.post('/auth/register', vendorController.register);

/**
 * @route   POST /api/vendors/auth/request-otp
 * @desc    Request OTP for vendor login/registration
 * @access  Public
 */
router.post('/auth/request-otp', vendorController.requestOTP);

/**
 * @route   POST /api/vendors/auth/verify-otp
 * @desc    Verify OTP and complete login/registration
 * @access  Public
 */
router.post('/auth/verify-otp', vendorController.verifyOTP);

/**
 * @route   POST /api/vendors/auth/logout
 * @desc    Vendor logout
 * @access  Private (Vendor)
 */
router.post('/auth/logout', authorizeVendor, vendorController.logout);

/**
 * @route   GET /api/vendors/auth/profile
 * @desc    Get vendor profile
 * @access  Private (Vendor)
 */
router.get('/auth/profile', authorizeVendor, vendorController.getProfile);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * @route   GET /api/vendors/dashboard
 * @desc    Get dashboard overview data
 * @access  Private (Vendor)
 */
router.get('/dashboard', authorizeVendor, vendorController.getDashboard);

// ============================================================================
// ORDER MANAGEMENT ROUTES
// ============================================================================

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :orderId routes
 */

/**
 * @route   GET /api/vendors/orders/stats
 * @desc    Get order statistics
 * @access  Private (Vendor)
 */
router.get('/orders/stats', authorizeVendor, vendorController.getOrderStats);

/**
 * @route   POST /api/vendors/orders/:orderId/accept
 * @desc    Accept order (full availability)
 * @access  Private (Vendor)
 */
router.post('/orders/:orderId/accept', authorizeVendor, vendorController.acceptOrder);

/**
 * @route   POST /api/vendors/orders/:orderId/reject
 * @desc    Reject order (no availability - escalates to Admin)
 * @access  Private (Vendor)
 */
router.post('/orders/:orderId/reject', authorizeVendor, vendorController.rejectOrder);

/**
 * @route   POST /api/vendors/orders/:orderId/accept-partial
 * @desc    Partially accept order (some items available, some not)
 * @access  Private (Vendor)
 */
router.post('/orders/:orderId/accept-partial', authorizeVendor, vendorController.acceptOrderPartially);

/**
 * @route   PUT /api/vendors/orders/:orderId/status
 * @desc    Update order status (Awaiting → Dispatched → Delivered)
 * @access  Private (Vendor)
 */
router.put('/orders/:orderId/status', authorizeVendor, vendorController.updateOrderStatus);

/**
 * @route   GET /api/vendors/orders
 * @desc    Get all orders with filtering
 * @access  Private (Vendor)
 */
router.get('/orders', authorizeVendor, vendorController.getOrders);

/**
 * @route   GET /api/vendors/orders/:orderId
 * @desc    Get order details
 * @access  Private (Vendor)
 */
router.get('/orders/:orderId', authorizeVendor, vendorController.getOrderDetails);

// ============================================================================
// PRODUCT MANAGEMENT ROUTES (For vendors to view and order products)
// ============================================================================

/**
 * @route   GET /api/vendors/products
 * @desc    Get all products available for ordering
 * @access  Private (Vendor)
 */
router.get('/products', authorizeVendor, vendorController.getProducts);

/**
 * @route   GET /api/vendors/products/:productId
 * @desc    Get product details for vendor
 * @access  Private (Vendor)
 */
router.get('/products/:productId', authorizeVendor, vendorController.getProductDetails);

// ============================================================================
// INVENTORY MANAGEMENT ROUTES
// ============================================================================

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :itemId routes
 */

/**
 * @route   GET /api/vendors/inventory/stats
 * @desc    Get inventory statistics
 * @access  Private (Vendor)
 */
router.get('/inventory/stats', authorizeVendor, vendorController.getInventoryStats);

/**
 * @route   PUT /api/vendors/inventory/:itemId/stock
 * @desc    Update stock quantity manually
 * @access  Private (Vendor)
 */
router.put('/inventory/:itemId/stock', authorizeVendor, vendorController.updateInventoryStock);

/**
 * @route   GET /api/vendors/inventory
 * @desc    Get all inventory items with filtering
 * @access  Private (Vendor)
 */
router.get('/inventory', authorizeVendor, vendorController.getInventory);

/**
 * @route   GET /api/vendors/inventory/:itemId
 * @desc    Get inventory item details
 * @access  Private (Vendor)
 */
router.get('/inventory/:itemId', authorizeVendor, vendorController.getInventoryItemDetails);

// ============================================================================
// CREDIT MANAGEMENT ROUTES
// ============================================================================

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic routes
 */

/**
 * @route   POST /api/vendors/credit/purchase
 * @desc    Request credit purchase from Admin (minimum ₹50,000)
 * @access  Private (Vendor)
 */
router.post('/credit/purchase', authorizeVendor, vendorController.requestCreditPurchase);

/**
 * @route   GET /api/vendors/credit/purchases
 * @desc    Get credit purchase request history
 * @access  Private (Vendor)
 */
router.get('/credit/purchases', authorizeVendor, vendorController.getCreditPurchases);

/**
 * @route   GET /api/vendors/credit/purchases/:requestId
 * @desc    Get credit purchase request details
 * @access  Private (Vendor)
 */
router.get('/credit/purchases/:requestId', authorizeVendor, vendorController.getCreditPurchaseDetails);

/**
 * @route   GET /api/vendors/credit/history
 * @desc    Get credit transaction history
 * @access  Private (Vendor)
 */
router.get('/credit/history', authorizeVendor, vendorController.getCreditHistory);

/**
 * @route   GET /api/vendors/credit
 * @desc    Get credit information (limit, used, remaining, penalty status, due date)
 * @access  Private (Vendor)
 */
router.get('/credit', authorizeVendor, vendorController.getCreditInfo);

// ============================================================================
// REPORTS & ANALYTICS ROUTES
// ============================================================================

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic routes
 */

/**
 * @route   GET /api/vendors/reports/analytics
 * @desc    Get performance analytics
 * @access  Private (Vendor)
 */
router.get('/reports/analytics', authorizeVendor, vendorController.getPerformanceAnalytics);

/**
 * @route   GET /api/vendors/reports
 * @desc    Get reports data (revenue, orders, metrics)
 * @access  Private (Vendor)
 */
router.get('/reports', authorizeVendor, vendorController.getReports);

// ============================================================================
// VENDOR-ADMIN MESSAGING ROUTES
// ============================================================================

/**
 * @route   POST /api/vendors/messages
 * @desc    Create message from vendor to admin
 * @access  Private (Vendor)
 */
router.post('/messages', authorizeVendor, vendorAdminMessageController.createMessage);

/**
 * @route   GET /api/vendors/messages
 * @desc    Get vendor's messages (sent and received)
 * @access  Private (Vendor)
 */
router.get('/messages', authorizeVendor, vendorAdminMessageController.getVendorMessages);

/**
 * @route   GET /api/vendors/messages/:messageId
 * @desc    Get vendor message details
 * @access  Private (Vendor)
 */
router.get('/messages/:messageId', authorizeVendor, vendorAdminMessageController.getVendorMessageDetails);

module.exports = router;

