const mongoose = require('mongoose');

/**
 * Repayment Discount Schema
 * 
 * Manages discount tiers for early credit repayments by vendors
 * Admin can configure multiple discount slabs based on payment timeline
 * 
 * Example: 0-30 days = 10% discount, 30-40 days = 6% discount, etc.
 */
const repaymentDiscountSchema = new mongoose.Schema({
    tierName: {
        type: String,
        required: [true, 'Tier name is required'],
        trim: true,
        // Example: "Early Payment Bonus", "30-Day Discount"
    },
    periodStart: {
        type: Number,
        required: [true, 'Period start is required'],
        min: [0, 'Period start cannot be negative'],
        // Start of period in days (e.g., 0, 30, 40)
    },
    periodEnd: {
        type: Number,
        required: [true, 'Period end is required'],
        min: [0, 'Period end cannot be negative'],
        // End of period in days (e.g., 30, 40, 60)
    },
    discountRate: {
        type: Number,
        required: [true, 'Discount rate is required'],
        min: [0, 'Discount rate cannot be negative'],
        max: [100, 'Discount rate cannot exceed 100%'],
        // Discount percentage (e.g., 10 for 10%)
    },
    description: {
        type: String,
        trim: true,
        // Description of this discount tier
    },
    isActive: {
        type: Boolean,
        default: true,
        // Admin can disable tiers without deleting them
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
    },
    // Metadata for tracking
    applicableFrom: {
        type: Date,
        default: Date.now,
        // When this tier becomes effective
    },
    applicableUntil: {
        type: Date,
        // Optional: When this tier expires
    },
}, {
    timestamps: true,
});

// Indexes for efficient querying
repaymentDiscountSchema.index({ periodStart: 1, periodEnd: 1 });
repaymentDiscountSchema.index({ isActive: 1, periodStart: 1 });

// Validation: Ensure periodEnd > periodStart
repaymentDiscountSchema.pre('save', function (next) {
    if (this.periodEnd <= this.periodStart) {
        return next(new Error('Period end must be greater than period start'));
    }
    next();
});

// Instance method: Check if tier applies to given days
repaymentDiscountSchema.methods.appliesTo = function (daysElapsed) {
    return this.isActive &&
        daysElapsed >= this.periodStart &&
        daysElapsed <= this.periodEnd;
};

// Static method: Find applicable tier for given days
repaymentDiscountSchema.statics.findApplicableTier = async function (daysElapsed) {
    return await this.findOne({
        isActive: true,
        periodStart: { $lte: daysElapsed },
        periodEnd: { $gte: daysElapsed },
    }).sort({ discountRate: -1 }); // Highest discount first
};

// Static method: Validate no overlaps with existing tiers
repaymentDiscountSchema.statics.validateNoOverlap = async function (periodStart, periodEnd, excludeId = null) {
    const query = {
        isActive: true,
        $or: [
            // New period overlaps with existing period start
            { periodStart: { $lte: periodEnd }, periodEnd: { $gte: periodStart } },
        ],
    };

    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const overlapping = await this.find(query);

    if (overlapping.length > 0) {
        const conflicts = overlapping.map(t => `${t.tierName} (${t.periodStart}-${t.periodEnd} days)`).join(', ');
        throw new Error(`Period overlaps with existing tier(s): ${conflicts}`);
    }

    return true;
};

const RepaymentDiscount = mongoose.model('RepaymentDiscount', repaymentDiscountSchema);

module.exports = RepaymentDiscount;
