const express = require('express');
const router = express.Router();

// Import controllers
const adminController = require('../controllers/adminController');
const vendorAdminMessageController = require('../controllers/vendorAdminMessageController');

// Import middleware
const { authorizeAdmin } = require('../middleware/auth');
// const { validateRequest } = require('../middleware/validation');

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login (Step 1: Email/Password)
 * @access  Public
 */
router.post('/auth/login', adminController.login);

/**
 * @route   POST /api/admin/auth/request-otp
 * @desc    Request OTP for admin login (Step 2)
 * @access  Public
 */
router.post('/auth/request-otp', adminController.requestOTP);

/**
 * @route   POST /api/admin/auth/verify-otp
 * @desc    Verify OTP and complete login
 * @access  Public
 */
router.post('/auth/verify-otp', adminController.verifyOTP);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Private (Admin)
 */
router.post('/auth/logout', authorizeAdmin, adminController.logout);

/**
 * @route   GET /api/admin/auth/profile
 * @desc    Get admin profile
 * @access  Private (Admin)
 */
router.get('/auth/profile', authorizeAdmin, adminController.getProfile);

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard overview data
 * @access  Private (Admin)
 */
router.get('/dashboard', authorizeAdmin, adminController.getDashboard);

// ============================================================================
// PRODUCT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/products
 * @desc    Get all products with filtering
 * @access  Private (Admin)
 */
router.get('/products', authorizeAdmin, adminController.getProducts);

/**
 * @route   GET /api/admin/products/:productId
 * @desc    Get product details
 * @access  Private (Admin)
 */
router.get('/products/:productId', authorizeAdmin, adminController.getProductDetails);

/**
 * @route   POST /api/admin/products
 * @desc    Create new product
 * @access  Private (Admin)
 */
router.post('/products', authorizeAdmin, adminController.createProduct);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :productId routes
 * Otherwise Express will match the generic route first
 */

/**
 * @route   POST /api/admin/products/:productId/assign
 * @desc    Assign product to vendor region-wise
 * @access  Private (Admin)
 */
router.post('/products/:productId/assign', authorizeAdmin, adminController.assignProductToVendor);

/**
 * @route   PUT /api/admin/products/:productId/visibility
 * @desc    Toggle product visibility (active/inactive)
 * @access  Private (Admin)
 */
router.put('/products/:productId/visibility', authorizeAdmin, adminController.toggleProductVisibility);

/**
 * @route   PUT /api/admin/products/:productId
 * @desc    Update product
 * @access  Private (Admin)
 */
router.put('/products/:productId', authorizeAdmin, adminController.updateProduct);

/**
 * @route   DELETE /api/admin/products/:productId
 * @desc    Delete product
 * @access  Private (Admin)
 */
router.delete('/products/:productId', authorizeAdmin, adminController.deleteProduct);

// ============================================================================
// VENDOR MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/vendors
 * @desc    Get all vendors with filtering
 * @access  Private (Admin)
 */
router.get('/vendors', authorizeAdmin, adminController.getVendors);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :vendorId routes
 */

/**
 * @route   POST /api/admin/vendors/:vendorId/approve
 * @desc    Approve vendor application
 * @access  Private (Admin)
 */
router.post('/vendors/:vendorId/approve', authorizeAdmin, adminController.approveVendor);

/**
 * @route   POST /api/admin/vendors/:vendorId/reject
 * @desc    Reject vendor application
 * @access  Private (Admin)
 */
router.post('/vendors/:vendorId/reject', authorizeAdmin, adminController.rejectVendor);

/**
 * @route   PUT /api/admin/vendors/:vendorId/credit-policy
 * @desc    Set vendor credit policy (limit, repayment days, penalty rate)
 * @access  Private (Admin)
 */
router.put('/vendors/:vendorId/credit-policy', authorizeAdmin, adminController.updateVendorCreditPolicy);

/**
 * @route   GET /api/admin/vendors/purchases
 * @desc    Get all vendor purchase requests (global, with optional filters)
 * @access  Private (Admin)
 */
router.get('/vendors/purchases', authorizeAdmin, adminController.getAllVendorPurchases);

/**
 * @route   GET /api/admin/vendors/:vendorId/purchases
 * @desc    Get vendor purchase requests (vendor-specific)
 * @access  Private (Admin)
 */
router.get('/vendors/:vendorId/purchases', authorizeAdmin, adminController.getVendorPurchases);

/**
 * @route   POST /api/admin/vendors/purchases/:requestId/approve
 * @desc    Approve vendor purchase request (≥₹50,000)
 * @access  Private (Admin)
 */
router.post('/vendors/purchases/:requestId/approve', authorizeAdmin, adminController.approveVendorPurchase);

/**
 * @route   POST /api/admin/vendors/purchases/:requestId/reject
 * @desc    Reject vendor purchase request
 * @access  Private (Admin)
 */
router.post('/vendors/purchases/:requestId/reject', authorizeAdmin, adminController.rejectVendorPurchase);

/**
 * @route   PUT /api/admin/vendors/:vendorId/ban
 * @desc    Ban vendor (temporary or permanent) - requires >3 escalations
 * @access  Private (Admin)
 */
router.put('/vendors/:vendorId/ban', authorizeAdmin, adminController.banVendor);

/**
 * @route   PUT /api/admin/vendors/:vendorId/unban
 * @desc    Revoke temporary ban
 * @access  Private (Admin)
 */
router.put('/vendors/:vendorId/unban', authorizeAdmin, adminController.unbanVendor);

/**
 * @route   GET /api/admin/vendors/:vendorId
 * @desc    Get vendor details
 * @access  Private (Admin)
 */
router.get('/vendors/:vendorId', authorizeAdmin, adminController.getVendorDetails);

/**
 * @route   DELETE /api/admin/vendors/:vendorId
 * @desc    Permanently delete vendor (soft delete - activities persist) - requires >3 escalations
 * @access  Private (Admin)
 */
router.delete('/vendors/:vendorId', authorizeAdmin, adminController.deleteVendor);

// ============================================================================
// SELLER (IRA PARTNER) MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/sellers
 * @desc    Get all sellers with filtering
 * @access  Private (Admin)
 */
router.get('/sellers', authorizeAdmin, adminController.getSellers);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :sellerId routes
 */

/**
 * @route   POST /api/admin/sellers/:sellerId/approve
 * @desc    Approve seller registration
 * @access  Private (Admin)
 */
router.post('/sellers/:sellerId/approve', authorizeAdmin, adminController.approveSeller);

/**
 * @route   POST /api/admin/sellers/:sellerId/reject
 * @desc    Reject seller registration
 * @access  Private (Admin)
 */
router.post('/sellers/:sellerId/reject', authorizeAdmin, adminController.rejectSeller);

/**
 * @route   PUT /api/admin/sellers/:sellerId/target
 * @desc    Set monthly sales target
 * @access  Private (Admin)
 */
router.put('/sellers/:sellerId/target', authorizeAdmin, adminController.setSellerTarget);

/**
 * @route   GET /api/admin/sellers/withdrawals
 * @desc    Get all seller withdrawal requests (global, with optional filters)
 * @access  Private (Admin)
 */
router.get('/sellers/withdrawals', authorizeAdmin, adminController.getAllSellerWithdrawals);

/**
 * @route   GET /api/admin/sellers/:sellerId/withdrawals
 * @desc    Get seller withdrawal requests (seller-specific)
 * @access  Private (Admin)
 */
router.get('/sellers/:sellerId/withdrawals', authorizeAdmin, adminController.getSellerWithdrawals);

/**
 * @route   POST /api/admin/sellers/withdrawals/:requestId/approve
 * @desc    Approve seller withdrawal request
 * @access  Private (Admin)
 */
router.post('/sellers/withdrawals/:requestId/approve', authorizeAdmin, adminController.approveSellerWithdrawal);

/**
 * @route   POST /api/admin/sellers/withdrawals/:requestId/reject
 * @desc    Reject seller withdrawal request
 * @access  Private (Admin)
 */
router.post('/sellers/withdrawals/:requestId/reject', authorizeAdmin, adminController.rejectSellerWithdrawal);

// ============================================================================
// VENDOR WITHDRAWAL MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/vendors/withdrawals
 * @desc    Get all vendor withdrawal requests (global, with optional filters)
 * @access  Private (Admin)
 */
router.get('/vendors/withdrawals', authorizeAdmin, adminController.getAllVendorWithdrawals);

/**
 * @route   POST /api/admin/vendors/withdrawals/:requestId/approve
 * @desc    Approve vendor withdrawal request
 * @access  Private (Admin)
 */
router.post('/vendors/withdrawals/:requestId/approve', authorizeAdmin, adminController.approveVendorWithdrawal);

/**
 * @route   POST /api/admin/vendors/withdrawals/:requestId/reject
 * @desc    Reject vendor withdrawal request
 * @access  Private (Admin)
 */
router.post('/vendors/withdrawals/:requestId/reject', authorizeAdmin, adminController.rejectVendorWithdrawal);

/**
 * @route   PUT /api/admin/vendors/withdrawals/:requestId/complete
 * @desc    Mark vendor withdrawal as completed (after payment processed)
 * @access  Private (Admin)
 */
router.put('/vendors/withdrawals/:requestId/complete', authorizeAdmin, adminController.completeVendorWithdrawal);

// ============================================================================
// UNIFIED WITHDRAWAL MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/withdrawals
 * @desc    Get all withdrawals (vendors + sellers) for admin dashboard
 * @access  Private (Admin)
 */
router.get('/withdrawals', authorizeAdmin, adminController.getAllWithdrawals);

/**
 * @route   GET /api/admin/payment-history
 * @desc    Get payment history for admin
 * @access  Private (Admin)
 */
router.get('/payment-history', authorizeAdmin, adminController.getPaymentHistory);

/**
 * @route   GET /api/admin/payment-history/stats
 * @desc    Get payment history statistics
 * @access  Private (Admin)
 */
router.get('/payment-history/stats', authorizeAdmin, adminController.getPaymentHistoryStats);

/**
 * @route   POST /api/admin/sellers
 * @desc    Create seller (IRA Partner)
 * @access  Private (Admin)
 */
router.post('/sellers', authorizeAdmin, adminController.createSeller);

/**
 * @route   PUT /api/admin/sellers/:sellerId
 * @desc    Update seller
 * @access  Private (Admin)
 */
router.put('/sellers/:sellerId', authorizeAdmin, adminController.updateSeller);

/**
 * @route   GET /api/admin/sellers/:sellerId
 * @desc    Get seller details
 * @access  Private (Admin)
 */
router.get('/sellers/:sellerId', authorizeAdmin, adminController.getSellerDetails);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering
 * @access  Private (Admin)
 */
router.get('/users', authorizeAdmin, adminController.getUsers);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :userId routes
 */

/**
 * @route   PUT /api/admin/users/:userId/block
 * @desc    Block/deactivate user account
 * @access  Private (Admin)
 */
router.put('/users/:userId/block', authorizeAdmin, adminController.blockUser);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user details
 * @access  Private (Admin)
 */
router.get('/users/:userId', authorizeAdmin, adminController.getUserDetails);

// ============================================================================
// ORDER & PAYMENT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with filtering
 * @access  Private (Admin)
 */
router.get('/orders', authorizeAdmin, adminController.getOrders);

/**
 * @route   GET /api/admin/orders/escalated
 * @desc    Get escalated orders (assigned to admin)
 * @access  Private (Admin)
 */
router.get('/orders/escalated', authorizeAdmin, adminController.getEscalatedOrders);

/**
 * IMPORTANT: Specific routes with sub-paths must come BEFORE generic :orderId routes
 */

/**
 * @route   POST /api/admin/orders/:orderId/revert-escalation
 * @desc    Revert escalation back to vendor
 * @access  Private (Admin)
 */
router.post('/orders/:orderId/revert-escalation', authorizeAdmin, adminController.revertEscalation);

/**
 * @route   PUT /api/admin/orders/:orderId/reassign
 * @desc    Reassign order to different vendor
 * @access  Private (Admin)
 */
router.put('/orders/:orderId/reassign', authorizeAdmin, adminController.reassignOrder);

/**
 * @route   POST /api/admin/orders/:orderId/fulfill
 * @desc    Fulfill escalated order from warehouse
 * @access  Private (Admin)
 */
router.post('/orders/:orderId/fulfill', authorizeAdmin, adminController.fulfillOrderFromWarehouse);

/**
 * @route   PUT /api/admin/orders/:orderId/status
 * @desc    Update order status (for admin-fulfilled orders)
 * @access  Private (Admin)
 */
router.put('/orders/:orderId/status', authorizeAdmin, adminController.updateOrderStatus);

/**
 * @route   GET /api/admin/orders/:orderId
 * @desc    Get order details
 * @access  Private (Admin)
 */
router.get('/orders/:orderId', authorizeAdmin, adminController.getOrderDetails);

/**
 * @route   GET /api/admin/orders/:orderId/invoice
 * @desc    Generate and download invoice PDF for order
 * @access  Private (Admin)
 */
router.get('/orders/:orderId/invoice', authorizeAdmin, adminController.generateInvoice);

/**
 * @route   GET /api/admin/commissions
 * @desc    Get all commissions with order and user details
 * @access  Private (Admin)
 */
router.get('/commissions', authorizeAdmin, adminController.getCommissions);

/**
 * @route   GET /api/admin/payments
 * @desc    Get all payments with filtering
 * @access  Private (Admin)
 */
router.get('/payments', authorizeAdmin, adminController.getPayments);

// ============================================================================
// FINANCE & CREDIT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/finance/credits
 * @desc    Get all vendor credits and outstanding amounts
 * @access  Private (Admin)
 */
router.get('/finance/credits', authorizeAdmin, adminController.getCredits);

/**
 * @route   GET /api/admin/finance/vendors/:vendorId/history
 * @desc    Get vendor credit history (purchases and repayments)
 * @access  Private (Admin)
 */
router.get('/finance/vendors/:vendorId/history', authorizeAdmin, adminController.getVendorCreditHistory);

/**
 * @route   GET /api/admin/finance/parameters
 * @desc    Get financial parameters (advance payment %, min order, min vendor purchase)
 * @access  Private (Admin)
 */
router.get('/finance/parameters', authorizeAdmin, adminController.getFinancialParameters);

/**
 * @route   PUT /api/admin/finance/parameters
 * @desc    Update financial parameters (currently read-only, returns 501)
 * @access  Private (Admin)
 */
router.put('/finance/parameters', authorizeAdmin, adminController.updateFinancialParameters);

/**
 * @route   GET /api/admin/finance/recovery
 * @desc    Get credit recovery status
 * @access  Private (Admin)
 */
router.get('/finance/recovery', authorizeAdmin, adminController.getRecoveryStatus);

// ============================================================================
// OPERATIONS & LOGISTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/operations/logistics-settings
 * @desc    Get logistics settings
 * @access  Private (Admin)
 */
router.get('/operations/logistics-settings', authorizeAdmin, adminController.getLogisticsSettings);

/**
 * @route   PUT /api/admin/operations/logistics-settings
 * @desc    Update logistics settings
 * @access  Private (Admin)
 */
router.put('/operations/logistics-settings', authorizeAdmin, adminController.updateLogisticsSettings);

/**
 * @route   GET /api/admin/operations/notifications
 * @desc    Get all platform notifications
 * @access  Private (Admin)
 */
router.get('/operations/notifications', authorizeAdmin, adminController.getNotifications);

/**
 * @route   POST /api/admin/operations/notifications
 * @desc    Create new platform notification
 * @access  Private (Admin)
 */
router.post('/operations/notifications', authorizeAdmin, adminController.createNotification);

/**
 * @route   PUT /api/admin/operations/notifications/:notificationId
 * @desc    Update platform notification
 * @access  Private (Admin)
 */
router.put('/operations/notifications/:notificationId', authorizeAdmin, adminController.updateNotification);

/**
 * @route   DELETE /api/admin/operations/notifications/:notificationId
 * @desc    Delete platform notification
 * @access  Private (Admin)
 */
router.delete('/operations/notifications/:notificationId', authorizeAdmin, adminController.deleteNotification);

// ============================================================================
// ANALYTICS & REPORTING ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/analytics
 * @desc    Get analytics data
 * @access  Private (Admin)
 */
router.get('/analytics', authorizeAdmin, adminController.getAnalytics);

/**
 * @route   GET /api/admin/reports
 * @desc    Generate reports (daily/weekly/monthly)
 * @access  Private (Admin)
 */
router.get('/reports', authorizeAdmin, adminController.generateReports);

// ============================================================================
// VENDOR-ADMIN MESSAGING ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/vendor-messages
 * @desc    Get admin messages (from all vendors)
 * @access  Private (Admin)
 */
router.get('/vendor-messages', authorizeAdmin, vendorAdminMessageController.getAdminMessages);

/**
 * @route   GET /api/admin/vendor-messages/stats
 * @desc    Get message statistics for admin dashboard
 * @access  Private (Admin)
 */
router.get('/vendor-messages/stats', authorizeAdmin, vendorAdminMessageController.getMessageStats);

/**
 * @route   GET /api/admin/vendor-messages/:messageId
 * @desc    Get admin message details
 * @access  Private (Admin)
 */
router.get('/vendor-messages/:messageId', authorizeAdmin, vendorAdminMessageController.getAdminMessageDetails);

/**
 * @route   POST /api/admin/vendor-messages
 * @desc    Admin sends reply/message to vendor
 * @access  Private (Admin)
 */
router.post('/vendor-messages', authorizeAdmin, vendorAdminMessageController.adminCreateMessage);

/**
 * @route   PUT /api/admin/vendor-messages/:messageId/status
 * @desc    Admin updates message status (resolve, close, etc.)
 * @access  Private (Admin)
 */
router.put('/vendor-messages/:messageId/status', authorizeAdmin, vendorAdminMessageController.updateMessageStatus);

/**
 * @route   PUT /api/admin/vendor-messages/:messageId/read
 * @desc    Mark message as read (Admin)
 * @access  Private (Admin)
 */
router.put('/vendor-messages/:messageId/read', authorizeAdmin, vendorAdminMessageController.markMessageAsRead);

module.exports = router;

