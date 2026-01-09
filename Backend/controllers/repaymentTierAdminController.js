/**
 * Repayment Tier Admin Controller
 * 
 * Handles admin operations for managing discount and interest tiers
 * This is a NEW controller for the vendor credit system rework
 * 
 * SAFETY: Does NOT modify existing vendor/admin controllers
 */

const RepaymentDiscount = require('../models/RepaymentDiscount');
const RepaymentInterest = require('../models/RepaymentInterest');
const PurchaseIncentive = require('../models/PurchaseIncentive');
const VendorIncentiveHistory = require('../models/VendorIncentiveHistory');
const TierValidationService = require('../services/tierValidationService');
const mongoose = require('mongoose');

// ============================================================================
// REPAYMENT DISCOUNT TIER MANAGEMENT
// ============================================================================

/**
 * @desc    Get all discount tiers
 * @route   GET /api/admin/repayment-config/discounts
 * @access  Private (Admin)
 */
exports.getDiscountTiers = async (req, res, next) => {
    try {
        const { isActive } = req.query;

        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const tiers = await RepaymentDiscount.find(query)
            .sort({ periodStart: 1 })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        // Get system status
        const systemStatus = await TierValidationService.getSystemStatus();

        res.status(200).json({
            success: true,
            count: tiers.length,
            data: tiers,
            systemStatus: systemStatus.discountTiers,
            meta: {
                isHealthy: systemStatus.isHealthy,
                warnings: systemStatus.warnings,
                errors: systemStatus.errors,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single discount tier
 * @route   GET /api/admin/repayment-config/discounts/:id
 * @access  Private (Admin)
 */
exports.getDiscountTier = async (req, res, next) => {
    try {
        const tier = await RepaymentDiscount.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!tier) {
            return res.status(404).json({
                success: false,
                message: 'Discount tier not found',
            });
        }

        res.status(200).json({
            success: true,
            data: tier,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create discount tier
 * @route   POST /api/admin/repayment-config/discounts
 * @access  Private (Admin)
 */
exports.createDiscountTier = async (req, res, next) => {
    try {
        const { tierName, periodStart, periodEnd, discountRate, description } = req.body;

        // Validate required fields
        if (!tierName || periodStart === undefined || periodEnd === undefined || discountRate === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tierName, periodStart, periodEnd, discountRate',
            });
        }

        // Validate the new tier
        const validation = await TierValidationService.validateNewDiscountTier({
            tierName,
            periodStart,
            periodEnd,
            discountRate,
        });

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Tier validation failed',
                errors: validation.errors,
                warnings: validation.warnings,
            });
        }

        // Create the tier
        const tier = await RepaymentDiscount.create({
            tierName,
            periodStart,
            periodEnd,
            discountRate,
            description,
            createdBy: req.admin._id,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            message: 'Discount tier created successfully',
            data: tier,
            warnings: validation.warnings,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update discount tier
 * @route   PUT /api/admin/repayment-config/discounts/:id
 * @access  Private (Admin)
 */
exports.updateDiscountTier = async (req, res, next) => {
    try {
        const { tierName, periodStart, periodEnd, discountRate, description, isActive } = req.body;

        const tier = await RepaymentDiscount.findById(req.params.id);

        if (!tier) {
            return res.status(404).json({
                success: false,
                message: 'Discount tier not found',
            });
        }

        // If period or rate is being changed, validate
        if (periodStart !== undefined || periodEnd !== undefined || discountRate !== undefined) {
            const validation = await TierValidationService.validateNewDiscountTier(
                {
                    tierName: tierName || tier.tierName,
                    periodStart: periodStart !== undefined ? periodStart : tier.periodStart,
                    periodEnd: periodEnd !== undefined ? periodEnd : tier.periodEnd,
                    discountRate: discountRate !== undefined ? discountRate : tier.discountRate,
                },
                req.params.id // Exclude current tier from overlap check
            );

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Tier validation failed',
                    errors: validation.errors,
                    warnings: validation.warnings,
                });
            }
        }

        // Update fields
        if (tierName) tier.tierName = tierName;
        if (periodStart !== undefined) tier.periodStart = periodStart;
        if (periodEnd !== undefined) tier.periodEnd = periodEnd;
        if (discountRate !== undefined) tier.discountRate = discountRate;
        if (description !== undefined) tier.description = description;
        if (isActive !== undefined) tier.isActive = isActive;
        tier.updatedBy = req.admin._id;

        await tier.save();

        res.status(200).json({
            success: true,
            message: 'Discount tier updated successfully',
            data: tier,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete discount tier
 * @route   DELETE /api/admin/repayment-config/discounts/:id
 * @access  Private (Admin)
 */
exports.deleteDiscountTier = async (req, res, next) => {
    try {
        const tier = await RepaymentDiscount.findById(req.params.id);

        if (!tier) {
            return res.status(404).json({
                success: false,
                message: 'Discount tier not found',
            });
        }

        await tier.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Discount tier deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================================
// REPAYMENT INTEREST TIER MANAGEMENT
// ============================================================================

/**
 * @desc    Get all interest tiers
 * @route   GET /api/admin/repayment-config/interests
 * @access  Private (Admin)
 */
exports.getInterestTiers = async (req, res, next) => {
    try {
        const { isActive } = req.query;

        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const tiers = await RepaymentInterest.find(query)
            .sort({ periodStart: 1 })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        // Get system status
        const systemStatus = await TierValidationService.getSystemStatus();

        res.status(200).json({
            success: true,
            count: tiers.length,
            data: tiers,
            systemStatus: systemStatus.interestTiers,
            meta: {
                isHealthy: systemStatus.isHealthy,
                warnings: systemStatus.warnings,
                errors: systemStatus.errors,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single interest tier
 * @route   GET /api/admin/repayment-config/interests/:id
 * @access  Private (Admin)
 */
exports.getInterestTier = async (req, res, next) => {
    try {
        const tier = await RepaymentInterest.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!tier) {
            return res.status(404).json({
                success: false,
                message: 'Interest tier not found',
            });
        }

        res.status(200).json({
            success: true,
            data: tier,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create interest tier
 * @route   POST /api/admin/repayment-config/interests
 * @access  Private (Admin)
 */
exports.createInterestTier = async (req, res, next) => {
    try {
        const { tierName, periodStart, periodEnd, interestRate, description, isOpenEnded } = req.body;

        // Validate required fields
        if (!tierName || periodStart === undefined || interestRate === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: tierName, periodStart, interestRate',
            });
        }

        // For non-open-ended tiers, periodEnd is required
        if (!isOpenEnded && periodEnd === undefined) {
            return res.status(400).json({
                success: false,
                message: 'periodEnd is required for non-open-ended tiers',
            });
        }

        // Validate the new tier
        const validation = await TierValidationService.validateNewInterestTier({
            tierName,
            periodStart,
            periodEnd: isOpenEnded ? Number.MAX_SAFE_INTEGER : periodEnd,
            interestRate,
            isOpenEnded: isOpenEnded || false,
        });

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Tier validation failed',
                errors: validation.errors,
                warnings: validation.warnings,
            });
        }

        // Create the tier
        const tier = await RepaymentInterest.create({
            tierName,
            periodStart,
            periodEnd: isOpenEnded ? Number.MAX_SAFE_INTEGER : periodEnd,
            interestRate,
            description,
            isOpenEnded: isOpenEnded || false,
            createdBy: req.admin._id,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            message: 'Interest tier created successfully',
            data: tier,
            warnings: validation.warnings,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update interest tier
 * @route   PUT /api/admin/repayment-config/interests/:id
 * @access  Private (Admin)
 */
exports.updateInterestTier = async (req, res, next) => {
    try {
        const { tierName, periodStart, periodEnd, interestRate, description, isActive, isOpenEnded } = req.body;

        const tier = await RepaymentInterest.findById(req.params.id);

        if (!tier) {
            return res.status(404).json({
                success: false,
                message: 'Interest tier not found',
            });
        }

        // If period or rate is being changed, validate
        if (periodStart !== undefined || periodEnd !== undefined || interestRate !== undefined || isOpenEnded !== undefined) {
            const validation = await TierValidationService.validateNewInterestTier(
                {
                    tierName: tierName || tier.tierName,
                    periodStart: periodStart !== undefined ? periodStart : tier.periodStart,
                    periodEnd: periodEnd !== undefined ? periodEnd : tier.periodEnd,
                    interestRate: interestRate !== undefined ? interestRate : tier.interestRate,
                    isOpenEnded: isOpenEnded !== undefined ? isOpenEnded : tier.isOpenEnded,
                },
                req.params.id // Exclude current tier from overlap check
            );

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Tier validation failed',
                    errors: validation.errors,
                    warnings: validation.warnings,
                });
            }
        }

        // Update fields
        if (tierName) tier.tierName = tierName;
        if (periodStart !== undefined) tier.periodStart = periodStart;
        if (periodEnd !== undefined) tier.periodEnd = periodEnd;
        if (interestRate !== undefined) tier.interestRate = interestRate;
        if (description !== undefined) tier.description = description;
        if (isActive !== undefined) tier.isActive = isActive;
        if (isOpenEnded !== undefined) tier.isOpenEnded = isOpenEnded;
        tier.updatedBy = req.admin._id;

        await tier.save();

        res.status(200).json({
            success: true,
            message: 'Interest tier updated successfully',
            data: tier,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete interest tier
 * @route   DELETE /api/admin/repayment-config/interests/:id
 * @access  Private (Admin)
 */
exports.deleteInterestTier = async (req, res, next) => {
    try {
        const tier = await RepaymentInterest.findById(req.params.id);

        if (!tier) {
            return res.status(404).json({
                success: false,
                message: 'Interest tier not found',
            });
        }

        await tier.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Interest tier deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================================
// SYSTEM STATUS & VALIDATION
// ============================================================================

/**
 * @desc    Get repayment system status (health check)
 * @route   GET /api/admin/repayment-config/status
 * @access  Private (Admin)
 */
exports.getSystemStatus = async (req, res, next) => {
    try {
        const status = await TierValidationService.getSystemStatus();

        res.status(200).json({
            success: true,
            data: status,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Validate tier configuration
 * @route   POST /api/admin/repayment-config/validate
 * @access  Private (Admin)
 */
exports.validateConfiguration = async (req, res, next) => {
    try {
        const separationValidation = await TierValidationService.validateDiscountInterestSeparation();
        const systemStatus = await TierValidationService.getSystemStatus();

        res.status(200).json({
            success: true,
            data: {
                isValid: separationValidation.valid && systemStatus.isHealthy,
                separation: separationValidation,
                systemStatus,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
