/**
 * Vendor Repayment Controller
 * 
 * Handles vendor operations for credit repayments with new discount/interest system
 * This is a NEW controller for the vendor credit system rework
 * 
 * SAFETY: Does NOT modify existing vendor controller
 */

const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const CreditPurchase = require('../models/CreditPurchase');
const CreditRepayment = require('../models/CreditRepayment');
const RepaymentCalculationService = require('../services/repaymentCalculationService');
const { generateUniqueId } = require('../utils/generateUniqueId');

// ============================================================================
// REP AYMENT CALCULATION & PROJECTION
// ============================================================================

/**
 * @desc    Calculate repayment amount for a credit purchase
 * @route   POST /api/vendors/credit/repayment/calculate
 * @access  Private (Vendor)
 */
exports.calculateRepayment = async (req, res, next) => {
    try {
        const { purchaseId, repaymentDate } = req.body;

        if (!purchaseId) {
            return res.status(400).json({
                success: false,
                message: 'Purchase ID is required',
            });
        }

        // Find the credit purchase
        const purchase = await CreditPurchase.findById(purchaseId);

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Credit purchase not found',
            });
        }

        // Verify ownership
        if (purchase.vendorId.toString() !== req.vendor._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - not your purchase',
            });
        }

        // Check if already repaid
        if (purchase.status === 'repaid') {
            return res.status(400).json({
                success: false,
                message: 'This purchase has already been repaid',
            });
        }

        // Calculate repayment amount
        const calculation = await RepaymentCalculationService.calculateRepaymentAmount(
            purchase,
            repaymentDate ? new Date(repaymentDate) : new Date()
        );

        res.status(200).json({
            success: true,
            data: calculation,
            purchase: {
                id: purchase._id,
                purchaseAmount: purchase.totalAmount,
                purchaseDate: purchase.createdAt,
                status: purchase.status,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get repayment projection schedule
 * @route   GET /api/vendors/credit/repayment/:purchaseId/projection
 * @access  Private (Vendor)
 */
exports.getRepaymentProjection = async (req, res, next) => {
    try {
        const { purchaseId } = req.params;

        // Find the credit purchase
        const purchase = await CreditPurchase.findById(purchaseId);

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: 'Credit purchase not found',
            });
        }

        // Verify ownership
        if (purchase.vendorId.toString() !== req.vendor._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - not your purchase',
            });
        }

        // Check if already repaid
        if (purchase.status === 'repaid') {
            return res.status(400).json({
                success: false,
                message: 'This purchase has already been repaid',
                repaidAt: purchase.deliveredAt,
            });
        }

        // Get projection schedule
        const projection = await RepaymentCalculationService.projectRepaymentSchedule(purchase);

        res.status(200).json({
            success: true,
            data: projection,
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================================
// REPAYMENT SUBMISSION
// ============================================================================

/**
 * @desc    Submit credit repayment
 * @route   POST /api/vendors/credit/repayment/:purchaseId/submit
 * @access  Private (Vendor)
 */
exports.submitRepayment = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { purchaseId } = req.params;
        const { repaymentAmount, paymentMode, transactionId, notes } = req.body;

        // Find the credit purchase
        const purchase = await CreditPurchase.findById(purchaseId).session(session);

        if (!purchase) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Credit purchase not found',
            });
        }

        // Verify ownership
        if (purchase.vendorId.toString() !== req.vendor._id.toString()) {
            await session.abortTransaction();
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - not your purchase',
            });
        }

        // Check if already repaid
        if (purchase.status === 'repaid') {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'This purchase has already been repaid',
            });
        }

        // Calculate expected repayment amount
        const calculation = await RepaymentCalculationService.calculateRepaymentAmount(
            purchase,
            new Date()
        );

        // Verify repayment amount matches calculation
        if (repaymentAmount && Math.abs(repaymentAmount - calculation.finalPayable) > 1) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Repayment amount does not match calculated amount',
                expected: calculation.finalPayable,
                provided: repaymentAmount,
                difference: Math.abs(repaymentAmount - calculation.finalPayable),
            });
        }

        // Get vendor
        const vendor = await Vendor.findById(req.vendor._id).session(session);

        if (!vendor) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }

        // Generate repayment ID
        const repaymentId = await generateUniqueId('REP');

        // Create repayment record
        const repayment = await CreditRepayment.create([{
            repaymentId,
            vendorId: vendor._id,
            purchaseOrderId: purchase._id,

            // Timeline
            purchaseDate: purchase.createdAt,
            dueDate: new Date(purchase.createdAt.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days from purchase
            repaymentDate: new Date(),
            daysElapsed: calculation.daysElapsed,

            // Amounts
            amount: calculation.baseAmount,
            originalAmount: calculation.baseAmount,
            adjustedAmount: calculation.finalPayable,
            totalAmount: calculation.finalPayable,

            // Discount/Interest applied
            discountApplied: calculation.tierType === 'discount' ? {
                tierName: calculation.tierApplied,
                tierId: calculation.tierId,
                discountRate: calculation.discountRate,
                discountAmount: calculation.discountAmount,
            } : undefined,

            interestApplied: calculation.tierType === 'interest' ? {
                tierName: calculation.tierApplied,
                tierId: calculation.tierId,
                interestRate: calculation.interestRate,
                interestAmount: calculation.interestAmount,
            } : undefined,

            // Financial breakdown
            financialBreakdown: calculation.financialBreakdown,

            // Metadata
            calculationMethod: 'tiered_discount_interest',
            calculatedAt: new Date(),
            calculationNotes: calculation.summary.message,

            // Deprecated field (for backward compatibility)
            penaltyAmount: calculation.penaltyFromLatePayment,

            // Credit tracking
            creditUsedBefore: vendor.creditUsed,
            creditUsedAfter: Math.max(0, vendor.creditUsed - calculation.baseAmount),

            // Payment details
            paymentMode: paymentMode || 'online',
            transactionId,
            notes,

            status: 'completed',
        }], { session });

        // Update vendor credit used
        vendor.creditUsed = Math.max(0, vendor.creditUsed - calculation.baseAmount);

        // Update vendor credit history
        const updatedHistory = RepaymentCalculationService.updateVendorCreditHistory(vendor, calculation);
        vendor.creditHistory = updatedHistory;

        await vendor.save({ session });

        // Update purchase status
        purchase.status = 'repaid';
        purchase.deliveredAt = new Date(); // Using deliveredAt to store repayment date
        await purchase.save({ session });

        // Commit transaction
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Repayment submitted successfully',
            data: {
                repayment: repayment[0],
                calculation,
                vendor: {
                    creditLimit: vendor.creditLimit,
                    creditUsed: vendor.creditUsed,
                    creditAvailable: vendor.creditLimit - vendor.creditUsed,
                    creditScore: vendor.creditHistory.creditScore,
                    performanceTier: vendor.performanceTier,
                },
            },
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

// ============================================================================
// REPAYMENT HISTORY
// ============================================================================

/**
 * @desc    Get vendor's repayment history
 * @route   GET /api/vendors/credit/repayments
 * @access  Private (Vendor)
 */
exports.getRepaymentHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, status } = req.query;

        const query = { vendorId: req.vendor._id };

        if (status) {
            query.status = status;
        }

        const repayments = await CreditRepayment.find(query)
            .populate('purchaseOrderId', 'items totalAmount createdAt')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await CreditRepayment.countDocuments(query);

        res.status(200).json({
            success: true,
            count: repayments.length,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            data: repayments,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single repayment details
 * @route   GET /api/vendors/credit/repayments/:id
 * @access  Private (Vendor)
 */
exports.getRepaymentDetails = async (req, res, next) => {
    try {
        const repayment = await CreditRepayment.findById(req.params.id)
            .populate('purchaseOrderId', 'items totalAmount createdAt status')
            .populate('vendorId', 'shopName email phone');

        if (!repayment) {
            return res.status(404).json({
                success: false,
                message: 'Repayment not found',
            });
        }

        // Verify ownership
        if (repayment.vendorId._id.toString() !== req.vendor._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        res.status(200).json({
            success: true,
            data: repayment,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get vendor credit summary
 * @route   GET /api/vendors/credit/summary
 * @access  Private (Vendor)
 */
exports.getCreditSummary = async (req, res, next) => {
    try {
        const vendor = await Vendor.findById(req.vendor._id);

        if (!vendor) {
            return res.status(404).json({
                success: false,
                message: 'Vendor not found',
            });
        }

        // Get outstanding purchases
        const outstandingPurchases = await CreditPurchase.find({
            vendorId: vendor._id,
            status: { $in: ['approved', 'sent'] },
        });

        // Get repayment count
        const repaymentCount = await CreditRepayment.countDocuments({
            vendorId: vendor._id,
            status: 'completed',
        });

        res.status(200).json({
            success: true,
            data: {
                creditLimit: vendor.creditLimit,
                creditUsed: vendor.creditUsed,
                creditAvailable: vendor.creditLimit - vendor.creditUsed,
                creditHistory: vendor.creditHistory,
                performanceTier: vendor.performanceTier,
                outstandingPurchases: {
                    count: outstandingPurchases.length,
                    totalAmount: outstandingPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
                    purchases: outstandingPurchases.map(p => ({
                        id: p._id,
                        amount: p.totalAmount,
                        date: p.createdAt,
                        status: p.status,
                    })),
                },
                totalRepayments: repaymentCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
