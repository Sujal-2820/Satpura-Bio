const mongoose = require('mongoose');

/**
 * Vendor Incentive History Schema
 * 
 * Tracks ORDER-BASED incentives earned and claimed by vendors
 * Links vendors to purchase incentives and tracks redemption status
 * 
 * TRIGGER: When vendor's order value meets incentive threshold
 * PURPOSE: Track which vendors earned which rewards and redemption status
 */
const vendorIncentiveHistorySchema = new mongoose.Schema({
    recordId: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        // Format: VIH-YYYYMMDD-XXXX
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: [true, 'Vendor ID is required'],
    },
    incentiveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseIncentive',
        required: [true, 'Incentive ID is required'],
    },
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CreditPurchase',
        // The credit purchase that qualified for this incentive
    },
    purchaseAmount: {
        type: Number,
        required: [true, 'Purchase amount is required'],
        min: [0, 'Purchase amount cannot be negative'],
    },
    // Incentive details (snapshot at time of earning)
    incentiveSnapshot: {
        title: String,
        description: String,
        rewardType: String,
        rewardValue: mongoose.Schema.Types.Mixed,
        rewardUnit: String,
    },
    // Claim status
    status: {
        type: String,
        enum: ['pending_approval', 'approved', 'claimed', 'rejected', 'expired'],
        default: 'pending_approval',
    },
    earnedAt: {
        type: Date,
        default: Date.now,
    },
    approvedAt: Date,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    claimedAt: Date,
    rejectedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    rejectionReason: {
        type: String,
        trim: true,
    },
    // If reward was applied (e.g., bonus credit added)
    rewardApplied: {
        type: Boolean,
        default: false,
    },
    rewardAppliedAt: Date,
    rewardDetails: {
        type: mongoose.Schema.Types.Mixed,
        // Details of how reward was applied (e.g., credit amount added, transaction ID)
    },
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

// Indexes
vendorIncentiveHistorySchema.index({ vendorId: 1, status: 1, earnedAt: -1 });
vendorIncentiveHistorySchema.index({ incentiveId: 1, status: 1 });
vendorIncentiveHistorySchema.index({ purchaseOrderId: 1 });

// Pre-save: Generate record ID
vendorIncentiveHistorySchema.pre('save', async function (next) {
    if (!this.recordId && this.isNew) {
        try {
            const date = new Date();
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

            const todayStart = new Date(date);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(date);
            todayEnd.setHours(23, 59, 59, 999);

            const todayCount = await this.constructor.countDocuments({
                createdAt: { $gte: todayStart, $lte: todayEnd },
            });

            const sequence = String(todayCount + 1).padStart(4, '0');
            this.recordId = `VIH-${dateStr}-${sequence}`;
        } catch (error) {
            const timestamp = Date.now().toString().slice(-8);
            this.recordId = `VIH-${timestamp}`;
        }
    }

    // Auto-update timestamps based on status
    if (this.isModified('status')) {
        if (this.status === 'approved' && !this.approvedAt) {
            this.approvedAt = new Date();
        } else if (this.status === 'claimed' && !this.claimedAt) {
            this.claimedAt = new Date();
        } else if (this.status === 'rejected' && !this.rejectedAt) {
            this.rejectedAt = new Date();
        }
    }

    next();
});

// Instance method: Mark as claimed
vendorIncentiveHistorySchema.methods.markAsClaimed = async function (rewardDetails = {}) {
    this.status = 'claimed';
    this.claimedAt = new Date();
    this.rewardApplied = true;
    this.rewardAppliedAt = new Date();
    this.rewardDetails = rewardDetails;
    return await this.save();
};

// Instance method: Approve claim
vendorIncentiveHistorySchema.methods.approve = async function (adminId) {
    this.status = 'approved';
    this.approvedAt = new Date();
    this.approvedBy = adminId;
    return await this.save();
};

// Instance method: Reject claim
vendorIncentiveHistorySchema.methods.reject = async function (adminId, reason) {
    this.status = 'rejected';
    this.rejectedAt = new Date();
    this.rejectedBy = adminId;
    this.rejectionReason = reason;
    return await this.save();
};

const VendorIncentiveHistory = mongoose.model('VendorIncentiveHistory', vendorIncentiveHistorySchema);

module.exports = VendorIncentiveHistory;
