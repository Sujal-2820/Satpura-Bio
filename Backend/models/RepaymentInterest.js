const mongoose = require('mongoose');

/**
 * Repayment Interest Schema
 * 
 * Manages interest/penalty tiers for late credit repayments by vendors
 * Admin can configure multiple interest slabs based on payment delay
 * 
 * Example: 105-120 days = 5% interest, 120+ days = 10% interest
 */
const repaymentInterestSchema = new mongoose.Schema({
    tierName: {
        type: String,
        required: [true, 'Tier name is required'],
        trim: true,
        // Example: "Late Payment Penalty", "Severe Delay Interest"
    },
    periodStart: {
        type: Number,
        required: [true, 'Period start is required'],
        min: [0, 'Period start cannot be negative'],
        // Start of period in days (e.g., 105, 120)
    },
    periodEnd: {
        type: Number,
        required: [true, 'Period end is required'],
        min: [0, 'Period end cannot be negative'],
        // End of period in days (e.g., 120). Use Infinity for open-ended
    },
    interestRate: {
        type: Number,
        required: [true, 'Interest rate is required'],
        min: [0, 'Interest rate cannot be negative'],
        max: [100, 'Interest rate cannot exceed 100%'],
        // Interest percentage (e.g., 5 for 5%, 10 for 10%)
    },
    description: {
        type: String,
        trim: true,
        // Description of this interest tier
    },
    isActive: {
        type: Boolean,
        default: true,
        // Admin can disable tiers without deleting them
    },
    isOpenEnded: {
        type: Boolean,
        default: false,
        // If true, this tier applies to all days >= periodStart
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
repaymentInterestSchema.index({ periodStart: 1, periodEnd: 1 });
repaymentInterestSchema.index({ isActive: 1, periodStart: 1 });

// Validation: Ensure periodEnd > periodStart (unless open-ended)
repaymentInterestSchema.pre('save', function (next) {
    if (!this.isOpenEnded && this.periodEnd <= this.periodStart) {
        return next(new Error('Period end must be greater than period start'));
    }

    // If open-ended, set periodEnd to a very large number for queries
    if (this.isOpenEnded) {
        this.periodEnd = Number.MAX_SAFE_INTEGER;
    }

    next();
});

// Instance method: Check if tier applies to given days
repaymentInterestSchema.methods.appliesTo = function (daysElapsed) {
    if (!this.isActive) return false;

    if (this.isOpenEnded) {
        return daysElapsed >= this.periodStart;
    }

    return daysElapsed >= this.periodStart && daysElapsed <= this.periodEnd;
};

// Static method: Find applicable tier for given days
repaymentInterestSchema.statics.findApplicableTier = async function (daysElapsed) {
    const tier = await this.findOne({
        isActive: true,
        periodStart: { $lte: daysElapsed },
        $or: [
            { isOpenEnded: true },
            { periodEnd: { $gte: daysElapsed } },
        ],
    }).sort({ interestRate: 1 }); // Lowest interest first (fair to vendor)

    return tier;
};

// Static method: Validate no overlaps with existing tiers
repaymentInterestSchema.statics.validateNoOverlap = async function (periodStart, periodEnd, isOpenEnded, excludeId = null) {
    const query = {
        isActive: true,
        $or: [
            // New period overlaps with existing period
            { periodStart: { $lte: periodEnd }, periodEnd: { $gte: periodStart } },
            // New period starts within an open-ended tier
            { isOpenEnded: true, periodStart: { $lte: periodStart } },
        ],
    };

    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const overlapping = await this.find(query);

    if (overlapping.length > 0) {
        const conflicts = overlapping.map(t =>
            `${t.tierName} (${t.periodStart}-${t.isOpenEnded ? '∞' : t.periodEnd} days)`
        ).join(', ');
        throw new Error(`Period overlaps with existing tier(s): ${conflicts}`);
    }

    return true;
};

const RepaymentInterest = mongoose.model('RepaymentInterest', repaymentInterestSchema);

module.exports = RepaymentInterest;
