const mongoose = require('mongoose');

/**
 * Purchase Incentive Schema
 * 
 * ORDER-BASED REWARDS: Manages incentive programs to encourage high-value orders
 * Admin creates schemes with rewards (gym membership, smartwatch, vouchers, etc.)
 * Vendors automatically qualify when placing orders that meet the threshold
 * 
 * NOT RELATED TO: Credit repayment, discount tiers, or interest charges
 * TRIGGER: When vendor places an order worth ≥ minPurchaseAmount
 * 
 * Example: "Place order worth ₹150,000+ and get 3-month gym membership"
 */
const purchaseIncentiveSchema = new mongoose.Schema({
    incentiveId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        uppercase: true,
        // Format: INC-001, INC-002, etc.
    },
    title: {
        type: String,
        required: [true, 'Incentive title is required'],
        trim: true,
        // Example: "Bulk Purchase Bonus", "First Order Discount"
    },
    description: {
        type: String,
        required: [true, 'Incentive description is required'],
        trim: true,
        // Detailed description of the incentive
    },
    minPurchaseAmount: {
        type: Number,
        required: [true, 'Minimum purchase amount is required'],
        min: [0, 'Minimum purchase amount cannot be negative'],
        // Minimum single order amount to qualify
    },
    maxPurchaseAmount: {
        type: Number,
        min: [0, 'Maximum purchase amount cannot be negative'],
        // Optional: Maximum amount (for tiered incentives)
    },
    rewardType: {
        type: String,
        required: [true, 'Reward type is required'],
        enum: [
            'voucher',           // Shopping vouchers (₹2000, ₹5000, etc.)
            'gym_membership',    // Gym/fitness center subscription
            'smartwatch',        // Fitness tracker or smartwatch
            'training_sessions', // Personal training sessions
            'gym_equipment',     // Home gym equipment
            'gift_hamper',       // Curated gift basket
            'cashback',          // Cash reward
            'bonus_credit',      // Extra credit limit
            'other'              // Admin-defined custom reward
        ],
        // Type of reward offered to vendor
    },
    rewardValue: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'Reward value is required'],
        // Numeric value (for discount/credit) or description (for gift)
    },
    rewardUnit: {
        type: String,
        enum: ['percentage', 'fixed_amount', 'description'],
        default: 'fixed_amount',
        // How to interpret rewardValue
    },
    conditions: {
        orderFrequency: {
            type: String,
            enum: ['first_order', 'any', 'recurring', 'milestone'],
            default: 'any',
            // When this incentive applies
        },
        minOrderCount: {
            type: Number,
            default: 1,
            // Minimum number of previous orders required
        },
        eligibleProducts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            // Optional: Specific products that qualify
        }],
        requiresApproval: {
            type: Boolean,
            default: false,
            // If true, admin must approve incentive claim
        },
    },
    validFrom: {
        type: Date,
        required: [true, 'Valid from date is required'],
        default: Date.now,
    },
    validUntil: {
        type: Date,
        // Optional: When incentive expires
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    maxRedemptions: {
        type: Number,
        // Optional: Limit total number of times this can be claimed
    },
    currentRedemptions: {
        type: Number,
        default: 0,
        // Track how many times claimed
    },
    maxRedemptionsPerVendor: {
        type: Number,
        default: 1,
        // How many times one vendor can claim this
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    notes: {
        type: String,
        trim: true,
        // Admin notes
    },
}, {
    timestamps: true,
});

// Indexes
purchaseIncentiveSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
purchaseIncentiveSchema.index({ minPurchaseAmount: 1, maxPurchaseAmount: 1 });

// Pre-save: Generate incentive ID
purchaseIncentiveSchema.pre('save', async function (next) {
    if (!this.incentiveId && this.isNew) {
        try {
            const count = await this.constructor.countDocuments();
            this.incentiveId = `INC-${String(count + 1).padStart(3, '0')}`;
        } catch (error) {
            const timestamp = Date.now().toString().slice(-6);
            this.incentiveId = `INC-${timestamp}`;
        }
    }

    // Validation: maxPurchaseAmount must be greater than minPurchaseAmount
    if (this.maxPurchaseAmount && this.maxPurchaseAmount <= this.minPurchaseAmount) {
        return next(new Error('Maximum purchase amount must be greater than minimum'));
    }

    next();
});

// Instance method: Check if vendor is eligible
purchaseIncentiveSchema.methods.isEligible = function (purchaseAmount, vendorOrderCount = 0) {
    // Check if active
    if (!this.isActive) return { eligible: false, reason: 'Incentive is not active' };

    // Check date validity
    const now = new Date();
    if (now < this.validFrom) return { eligible: false, reason: 'Incentive not yet valid' };
    if (this.validUntil && now > this.validUntil) return { eligible: false, reason: 'Incentive has expired' };

    // Check max redemptions
    if (this.maxRedemptions && this.currentRedemptions >= this.maxRedemptions) {
        return { eligible: false, reason: 'Maximum redemptions reached' };
    }

    // Check purchase amount
    if (purchaseAmount < this.minPurchaseAmount) {
        return {
            eligible: false,
            reason: `Minimum purchase amount is ₹${this.minPurchaseAmount}`
        };
    }

    if (this.maxPurchaseAmount && purchaseAmount > this.maxPurchaseAmount) {
        return {
            eligible: false,
            reason: `Maximum purchase amount is ₹${this.maxPurchaseAmount}`
        };
    }

    // Check order frequency
    if (this.conditions.orderFrequency === 'first_order' && vendorOrderCount > 0) {
        return { eligible: false, reason: 'Incentive only for first order' };
    }

    if (this.conditions.minOrderCount && vendorOrderCount < this.conditions.minOrderCount) {
        return {
            eligible: false,
            reason: `Minimum ${this.conditions.minOrderCount} orders required`
        };
    }

    return { eligible: true };
};

// Static method: Find applicable incentives for a purchase
purchaseIncentiveSchema.statics.findApplicableIncentives = async function (purchaseAmount, vendorId) {
    const now = new Date();

    const incentives = await this.find({
        isActive: true,
        validFrom: { $lte: now },
        $or: [
            { validUntil: { $exists: false } },
            { validUntil: { $gte: now } },
        ],
        minPurchaseAmount: { $lte: purchaseAmount },
        $or: [
            { maxPurchaseAmount: { $exists: false } },
            { maxPurchaseAmount: { $gte: purchaseAmount } },
        ],
    });

    return incentives;
};

const PurchaseIncentive = mongoose.model('PurchaseIncentive', purchaseIncentiveSchema);

module.exports = PurchaseIncentive;
