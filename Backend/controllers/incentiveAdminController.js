const PurchaseIncentive = require('../models/PurchaseIncentive');
const VendorIncentiveHistory = require('../models/VendorIncentiveHistory');
const Vendor = require('../models/Vendor');

/**
 * Repayment Incentive Admin Controller
 * 
 * Manages order-based incentive schemes and vendor reward claims
 */

// ============================================================================
// PURCHASE INCENTIVE SCHEMES (CRUD)
// ============================================================================

/**
 * Get all incentive schemes
 * GET /api/admin/repayment-config/incentives
 */
exports.getAllIncentives = async (req, res) => {
    try {
        const incentives = await PurchaseIncentive.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: incentives });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

/**
 * Create new incentive scheme
 * POST /api/admin/repayment-config/incentives
 */
exports.createIncentive = async (req, res) => {
    try {
        const incentive = new PurchaseIncentive({
            ...req.body,
            createdBy: req.admin._id
        });
        await incentive.save();
        res.status(201).json({ success: true, data: incentive });
    } catch (error) {
        res.status(400).json({ success: false, error: { message: error.message } });
    }
};

/**
 * Update incentive scheme
 * PUT /api/admin/repayment-config/incentives/:id
 */
exports.updateIncentive = async (req, res) => {
    try {
        const incentive = await PurchaseIncentive.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedBy: req.admin._id },
            { new: true, runValidators: true }
        );
        if (!incentive) {
            return res.status(404).json({ success: false, error: { message: 'Incentive not found' } });
        }
        res.status(200).json({ success: true, data: incentive });
    } catch (error) {
        res.status(400).json({ success: false, error: { message: error.message } });
    }
};

/**
 * Delete incentive scheme
 * DELETE /api/admin/repayment-config/incentives/:id
 */
exports.deleteIncentive = async (req, res) => {
    try {
        const incentive = await PurchaseIncentive.findByIdAndDelete(req.params.id);
        if (!incentive) {
            return res.status(404).json({ success: false, error: { message: 'Incentive not found' } });
        }
        res.status(200).json({ success: true, message: 'Incentive deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

// ============================================================================
// VENDOR INCENTIVE CLAIMS (TRACKING & APPROVAL)
// ============================================================================

/**
 * Get all incentive history/claims
 * GET /api/admin/repayment-config/incentive-history
 */
exports.getIncentiveHistory = async (req, res) => {
    try {
        const { status, vendorId } = req.query;
        const query = {};
        if (status) query.status = status;
        if (vendorId) query.vendorId = vendorId;

        const history = await VendorIncentiveHistory.find(query)
            .populate('vendorId', 'name businessName phone')
            .populate('incentiveId', 'title rewardType rewardValue')
            .sort({ earnedAt: -1 });

        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

/**
 * Approve an incentive claim
 * POST /api/admin/repayment-config/incentive-claims/:id/approve
 */
exports.approveClaim = async (req, res) => {
    try {
        const history = await VendorIncentiveHistory.findById(req.params.id);
        if (!history) {
            return res.status(404).json({ success: false, error: { message: 'Claim record not found' } });
        }

        if (history.status !== 'pending_approval') {
            return res.status(400).json({ success: false, error: { message: `Cannot approve claim in ${history.status} status` } });
        }

        await history.approve(req.admin._id);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

/**
 * Reject an incentive claim
 * POST /api/admin/repayment-config/incentive-claims/:id/reject
 */
exports.rejectClaim = async (req, res) => {
    try {
        const { reason } = req.body;
        const history = await VendorIncentiveHistory.findById(req.params.id);
        if (!history) {
            return res.status(404).json({ success: false, error: { message: 'Claim record not found' } });
        }

        if (history.status !== 'pending_approval') {
            return res.status(400).json({ success: false, error: { message: `Cannot reject claim in ${history.status} status` } });
        }

        await history.reject(req.admin._id, reason);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

/**
 * Mark an incentive as claimed/dispatched
 * POST /api/admin/repayment-config/incentive-claims/:id/claim
 */
exports.markAsClaimed = async (req, res) => {
    try {
        const history = await VendorIncentiveHistory.findById(req.params.id);
        if (!history) {
            return res.status(404).json({ success: false, error: { message: 'Claim record not found' } });
        }

        if (history.status !== 'approved') {
            return res.status(400).json({ success: false, error: { message: 'Only approved claims can be marked as claimed' } });
        }

        await history.markAsClaimed(req.body.details || {});
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};
