/**
 * Vendor Repayment Routes
 * 
 * NEW routes for vendor credit repayment operations
 * Isolated from existing vendor routes for safety
 */

const express = require('express');
const router = express.Router();
const vendorRepaymentController = require('../controllers/vendorRepaymentController');
const { authorizeVendor } = require('../middleware/auth');

// ============================================================================
// REPAYMENT CALCULATION & PROJECTION
// ============================================================================

/**
 * @route   POST /api/vendors/credit/repayment/calculate
 * @desc    Calculate repayment amount for a credit purchase
 * @access  Private (Vendor)
 */
router.post('/calculate', authorizeVendor, vendorRepaymentController.calculateRepayment);

/**
 * @route   GET /api/vendors/credit/repayment/:purchaseId/projection
 * @desc    Get repayment projection schedule
 * @access  Private (Vendor)
 */
router.get('/:purchaseId/projection', authorizeVendor, vendorRepaymentController.getRepaymentProjection);

// ============================================================================
// REPAYMENT SUBMISSION
// ============================================================================

/**
 * @route   POST /api/vendors/credit/repayment/:purchaseId/submit
 * @desc    Submit credit repayment
 * @access  Private (Vendor)
 */
router.post('/:purchaseId/submit', authorizeVendor, vendorRepaymentController.submitRepayment);

// ============================================================================
// REPAYMENT HISTORY
// ============================================================================

/**
 * @route   GET /api/vendors/credit/repayments
 * @desc    Get vendor's repayment history
 * @access  Private (Vendor)
 */
// Note: This uses /repayments (plural) as parent will mount at /credit/repayment
router.get('s', authorizeVendor, vendorRepaymentController.getRepaymentHistory);

/**
 * @route   GET /api/vendors/credit/repayments/:id
 * @desc    Get single repayment details
 * @access  Private (Vendor)
 */
router.get('s/:id', authorizeVendor, vendorRepaymentController.getRepaymentDetails);

// ============================================================================
// CREDIT SUMMARY
// ============================================================================

/**
 * @route   GET /api/vendors/credit/summary
 * @desc    Get vendor credit summary
 * @access  Private (Vendor)
 */
router.get('/summary', authorizeVendor, vendorRepaymentController.getCreditSummary);

module.exports = router;
