/**
 * Admin Repayment Configuration Routes
 * 
 * NEW routes for managing discount/interest tiers
 * Isolated from existing admin routes for safety
 */

const express = require('express');
const router = express.Router();
const repaymentTierAdminController = require('../controllers/repaymentTierAdminController');
const { authorizeAdmin } = require('../middleware/auth');

// ============================================================================
// DISCOUNT TIER MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/repayment-config/discounts
 * @desc    Get all discount tiers
 * @access  Private (Admin)
 */
router.get('/discounts', authorizeAdmin, repaymentTierAdminController.getDiscountTiers);

/**
 * @route   GET /api/admin/repayment-config/discounts/:id
 * @desc   Get single discount tier
 * @access  Private (Admin)
 */
router.get('/discounts/:id', authorizeAdmin, repaymentTierAdminController.getDiscountTier);

/**
 * @route   POST /api/admin/repayment-config/discounts
 * @desc    Create discount tier
 * @access  Private (Admin)
 */
router.post('/discounts', authorizeAdmin, repaymentTierAdminController.createDiscountTier);

/**
 * @route   PUT /api/admin/repayment-config/discounts/:id
 * @desc    Update discount tier
 * @access  Private (Admin)
 */
router.put('/discounts/:id', authorizeAdmin, repaymentTierAdminController.updateDiscountTier);

/**
 * @route   DELETE /api/admin/repayment-config/discounts/:id
 * @desc    Delete discount tier
 * @access  Private (Admin)
 */
router.delete('/discounts/:id', authorizeAdmin, repaymentTierAdminController.deleteDiscountTier);

// ============================================================================
// INTEREST TIER MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/repayment-config/interests
 * @desc    Get all interest tiers
 * @access  Private (Admin)
 */
router.get('/interests', authorizeAdmin, repaymentTierAdminController.getInterestTiers);

/**
 * @route   GET /api/admin/repayment-config/interests/:id
 * @desc    Get single interest tier
 * @access  Private (Admin)
 */
router.get('/interests/:id', authorizeAdmin, repaymentTierAdminController.getInterestTier);

/**
 * @route   POST /api/admin/repayment-config/interests
 * @desc    Create interest tier
 * @access  Private (Admin)
 */
router.post('/interests', authorizeAdmin, repaymentTierAdminController.createInterestTier);

/**
 * @route   PUT /api/admin/repayment-config/interests/:id
 * @desc    Update interest tier
 * @access  Private (Admin)
 */
router.put('/interests/:id', authorizeAdmin, repaymentTierAdminController.updateInterestTier);

/**
 * @route   DELETE /api/admin/repayment-config/interests/:id
 * @desc    Delete interest tier
 * @access  Private (Admin)
 */
router.delete('/interests/:id', authorizeAdmin, repaymentTierAdminController.deleteInterestTier);

// ============================================================================
// SYSTEM STATUS & VALIDATION
// ============================================================================

/**
 * @route   GET /api/admin/repayment-config/status
 * @desc    Get repayment system status
 * @access  Private (Admin)
 */
router.get('/status', authorizeAdmin, repaymentTierAdminController.getSystemStatus);

/**
 * @route   POST /api/admin/repayment-config/validate
 * @desc    Validate tier configuration
 * @access  Private (Admin)
 */
router.post('/validate', authorizeAdmin, repaymentTierAdminController.validateConfiguration);

module.exports = router;
