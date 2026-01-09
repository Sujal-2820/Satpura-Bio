const PurchaseIncentive = require('../models/PurchaseIncentive');
const VendorIncentiveHistory = require('../models/VendorIncentiveHistory');
const CreditPurchase = require('../models/CreditPurchase');

/**
 * Incentive Service
 * 
 * Handles business logic for purchase-based incentives
 */

/**
 * Check and apply incentives for a new purchase
 * 
 * @param {string} purchaseId - CreditPurchase ID
 * @param {string} vendorId - Vendor ID
 * @param {number} amount - Purchase amount
 */
exports.processIncentivesForPurchase = async (purchaseId, vendorId, amount) => {
    try {
        console.log(`[IncentiveService] Processing incentives for vendor ${vendorId}, amount ${amount}`);

        // 1. Find all active and applicable incentives
        const incentives = await PurchaseIncentive.findApplicableIncentives(amount, vendorId);

        if (!incentives || incentives.length === 0) {
            console.log('[IncentiveService] No applicable incentives found');
            return [];
        }

        console.log(`[IncentiveService] Found ${incentives.length} potential incentives`);

        const createdRecords = [];

        for (const incentive of incentives) {
            // 2. Double check eligibility (including order frequency)
            // Need vendor order count for frequency check
            const orderCount = await CreditPurchase.countDocuments({ vendorId, status: 'approved' });

            const eligibility = incentive.isEligible(amount, orderCount);

            if (!eligibility.eligible) {
                console.log(`[IncentiveService] Vendor not eligible for ${incentive.title}: ${eligibility.reason}`);
                continue;
            }

            // 3. Check if vendor already claimed this (if maxRedemptionsPerVendor is 1)
            const existingClaim = await VendorIncentiveHistory.findOne({
                vendorId,
                incentiveId: incentive._id,
                status: { $ne: 'rejected' }
            });

            if (existingClaim && incentive.maxRedemptionsPerVendor && (await VendorIncentiveHistory.countDocuments({ vendorId, incentiveId: incentive._id, status: { $ne: 'rejected' } })) >= incentive.maxRedemptionsPerVendor) {
                console.log(`[IncentiveService] Vendor already claimed/earning incentive ${incentive.title}`);
                continue;
            }

            // 4. Create history record
            const history = new VendorIncentiveHistory({
                vendorId,
                incentiveId: incentive._id,
                purchaseOrderId: purchaseId,
                purchaseAmount: amount,
                incentiveSnapshot: {
                    title: incentive.title,
                    description: incentive.description,
                    rewardType: incentive.rewardType,
                    rewardValue: incentive.rewardValue,
                    rewardUnit: incentive.rewardUnit
                },
                status: incentive.conditions?.requiresApproval ? 'pending_approval' : 'approved',
                earnedAt: new Date(),
                notes: `Automatically earned from order ${purchaseId}`
            });

            await history.save();

            // 5. Update current redemptions on the scheme
            incentive.currentRedemptions += 1;
            await incentive.save();

            createdRecords.push(history);
            console.log(`[IncentiveService] Incentive ${incentive.title} recorded for vendor`);
        }

        return createdRecords;

    } catch (error) {
        console.error('[IncentiveService] Error processing incentives:', error);
        throw error;
    }
};

/**
 * Get available schemes for a vendor (for browsing)
 */
exports.getAvailableSchemes = async (vendorId) => {
    try {
        const now = new Date();
        const incentives = await PurchaseIncentive.find({
            isActive: true,
            validFrom: { $lte: now },
            $or: [
                { validUntil: { $exists: false } },
                { validUntil: { $gte: now } },
            ]
        }).sort({ minPurchaseAmount: 1 });

        return incentives;
    } catch (error) {
        console.error('[IncentiveService] Error getting available schemes:', error);
        throw error;
    }
};
