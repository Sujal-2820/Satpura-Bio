const PurchaseIncentive = require('../models/PurchaseIncentive');
const VendorIncentiveHistory = require('../models/VendorIncentiveHistory');
const CreditPurchase = require('../models/CreditPurchase');

/**
 * Get available incentive schemes for the authenticated vendor
 */
exports.getAvailableSchemes = async (req, res, next) => {
    try {
        const vendorId = req.vendor._id;
        const now = new Date();

        // 1. Fetch all active schemes within valid date range
        const schemes = await PurchaseIncentive.find({
            isActive: true,
            validFrom: { $lte: now },
            $or: [
                { validUntil: { $exists: false } }, // No end date
                { validUntil: { $gte: now } }    // Not expired
            ]
        }).sort({ minPurchaseAmount: 1 }).lean();

        // 2. Enhance with vendor's progress/eligibility
        // Note: For now, we just return the available schemes.
        // In the future, we could check how close the vendor is to qualifying based on recent orders.

        res.status(200).json({
            success: true,
            data: schemes
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get vendor's earned incentive history
 */
exports.getIncentiveHistory = async (req, res, next) => {
    try {
        const vendorId = req.vendor._id;
        const { status } = req.query;

        const query = { vendorId };
        if (status) {
            query.status = status;
        }

        const history = await VendorIncentiveHistory.find(query)
            .populate('purchaseOrderId', 'creditPurchaseId totalAmount createdAt')
            .sort({ earnedAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Claim/Acknowledge a reward
 * (Usually used for rewards that aren't auto-approvable or need selection)
 */
exports.claimReward = async (req, res, next) => {
    try {
        const vendorId = req.vendor._id;
        const { claimId } = req.params;
        const { notes } = req.body;

        const claim = await VendorIncentiveHistory.findOne({
            _id: claimId,
            vendorId
        });

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'Incentive claim not found'
            });
        }

        if (claim.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: `Cannot claim reward in ${claim.status} status`
            });
        }

        // Move to pending claim (meaning vendor said "I want this")
        // Note: This applies if we didn't automatically mark it as 'claimed'
        claim.status = 'claimed';
        claim.claimNotes = notes;
        claim.claimedAt = new Date();

        await claim.save();

        res.status(200).json({
            success: true,
            data: claim,
            message: 'Your claim request has been submitted to the admin.'
        });
    } catch (error) {
        next(error);
    }
};
