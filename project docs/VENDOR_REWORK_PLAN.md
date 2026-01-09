# Vendor Module Rework - Implementation Plan
> **Project:** Satpura Bio  
> **Date:** January 7, 2026  
> **Complexity:** HIGH - Core Business Logic Modification

---

## Executive Summary

### Objective
Implement a sophisticated credit discount/interest system for vendor repayments while maintaining all existing functionality.

### Key Requirements
1. **Credit Limit**: Default 2 Lakhs (₹200,000) per vendor
2. **Repayment Discount Tiers** (Early Payment Incentives):
   - 0-30 days: 10% discount
   - 30-40 days: 6% discount
   - 40-60 days: 4% discount
   - 60-90 days: 2% discount
   - 90-105 days: 0% (no discount, no interest)
   
3. **Interest Penalties** (Late Payment):
   - 105-120 days: 5% interest
   - 120+ days: 10% interest (sustained)

4. **Admin Management**:
   - Fully configurable discount/interest slabs
   - Strict validation to prevent sequence breaks
   - Purchase-based incentive system

---

## Current System Analysis

### Existing Models
1. **Vendor.js**: Basic credit tracking (creditLimit, creditUsed, creditPolicy)
2. **CreditPurchase.js**: Credit purchase requests (₹50k-₹100k range)
3. **CreditRepayment.js**: Repayment tracking with penalty field

### Gaps Identified
- ❌ No configurable discount/interest tiers
- ❌ No time-based discount calculation
- ❌ No admin interface for managing tiers
- ❌ No purchase incentive system
- ❌ Basic credit policy (only repaymentDays and penaltyRate)

---

## Implementation Strategy (BMAD Methodology)

### Phase 1: BUILD - Schema & Model Design

#### 1.1 New Models Required

##### A. RepaymentDiscount Model
```javascript
{
  periodStart: Number,    // Start of period (days)
  periodEnd: Number,      // End of period (days)
  discountRate: Number,   // Discount percentage (e.g., 10 for 10%)
  isActive: Boolean,      // Admin can disable
  createdAt: Date,
  updatedAt: Date
}
```

##### B. RepaymentInterest Model
```javascript
{
  periodStart: Number,    // Start of period (days)
  periodEnd: Number,      // End of period (days)
  interestRate: Number,   // Interest percentage (e.g., 5 for 5%)
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

##### C. PurchaseIncentive Model
```javascript
{
  title: String,
  description: String,
  minPurchaseAmount: Number,     // Minimum single order amount
  maxPurchaseAmount: Number,     // Maximum (if any)
  rewardType: String,            // 'discount', 'bonus_credit', 'gift', 'points'
  rewardValue: Number/String,    // Value/description of reward
  validFrom: Date,
  validUntil: Date,
  isActive: Boolean,
  conditions: {
    orderFrequency: String,      // 'first_order', 'any', 'recurring'
    eligibleProducts: [ObjectId] // Specific products (if any)
  }
}
```

##### D. VendorIncentiveHistory Model
```javascript
{
  vendorId: ObjectId,
  incentiveId: ObjectId,
  purchaseOrderId: ObjectId,
  rewardClaimed: Boolean,
  rewardClaimedAt: Date,
  rewardDetails: Mixed
}
```

#### 1.2 Extend Existing Models

##### Extend CreditRepayment.js
```javascript
// ADD:
{
  purchaseOrderId: ObjectId,        // Link to CreditPurchase
  purchaseDate: Date,               // When credit was taken
  dueDate: Date,                    // Expected repayment date
  repaymentDate: Date,              // Actual repayment date
  daysElapsed: Number,              // Days from purchase to repayment
  
  // Discount/Interest Breakdown
  discountApplied: {
    tierName: String,               // e.g., "0-30 days tier"
    discountRate: Number,           // e.g., 10
    discountAmount: Number,         // Calculated discount
    discountTierId: ObjectId        // Reference to RepaymentDiscount
  },
  
  interestApplied: {
    tierName: String,
    interestRate: Number,
    interestAmount: Number,
    interestTierId: ObjectId
  },
  
  originalAmount: Number,           // Before discount/interest
  adjustedAmount: Number,           // After discount/interest
  
  // Calculated fields
  financialBreakdown: {
    baseAmount: Number,
    discountDeduction: Number,
    interestAddition: Number,
    finalPayable: Number
  }
}
```

##### Extend Vendor.js
```javascript
// ADD:
{
  creditHistory: {
    totalCreditTaken: Number,
    totalRepaid: Number,
    totalDiscountsEarned: Number,
    totalInterestPaid: Number,
    avgRepaymentDays: Number,
    onTimeRepaymentCount: Number,
    lateRepaymentCount: Number
  },
  
  incentivesEarned: [{
    incentiveId: ObjectId,
    earnedAt: Date,
    rewardValue: Mixed
  }]
}
```

---

### Phase 2: MODEL - Business Logic & Validation

#### 2.1 Validation Rules

##### Discount/Interest Tier Validation
```javascript
validateTierSequence(tiers) {
  // Rules:
  // 1. No gaps between periods
  // 2. No overlaps
  // 3. Periods must be chronological
  // 4. Discount tiers come before interest tiers
  // 5. There must be a "neutral zone" (0% discount, 0% interest)
  
  // CRITICAL: Prevent admin from creating:
  // - Negative periods
  // - Overlapping periods
  // - Missing neutral zone
  // - Interest before discount periods
}
```

##### Credit Limit Validation
```javascript
validateCreditPurchase(vendor, purchaseAmount) {
  const availableCredit = vendor.creditLimit - vendor.creditUsed;
  
  if (purchaseAmount > availableCredit) {
    throw new Error('Insufficient credit limit');
  }
  
  // Additional checks:
  // - Vendor status must be 'approved'
  // - No outstanding overdues beyond 120 days
  // - Previous purchases must be repaid (or within allowed multiple credit purchases)
}
```

#### 2.2 Calculation Logic

##### Repayment Amount Calculator
```javascript
calculateRepaymentAmount(creditPurchase, repaymentDate) {
  const purchaseDate = creditPurchase.createdAt;
  const daysElapsed = Math.floor((repaymentDate - purchaseDate) / (1000 * 60 * 60 * 24));
  
  let baseAmount = creditPurchase.totalAmount;
  let discountAmount = 0;
  let interestAmount = 0;
  let applicableTier = null;
  
  // Step 1: Find applicable discount tier
  const discountTier = await RepaymentDiscount.findOne({
    periodStart: { $lte: daysElapsed },
    periodEnd: { $gte: daysElapsed },
    isActive: true
  }).sort({ discountRate: -1 }); // Highest discount first
  
  if (discountTier) {
    discountAmount = (baseAmount * discountTier.discountRate) / 100;
    applicableTier = discountTier;
  }
  
  // Step 2: Find applicable interest tier (mutually exclusive with discount)
  if (!discountTier) {
    const interestTier = await RepaymentInterest.findOne({
      periodStart: { $lte: daysElapsed },
      periodEnd: { $gte: daysElapsed },
      isActive: true
    }).sort({ interestRate: 1 }); // Lowest interest first
    
    if (interestTier) {
      interestAmount = (baseAmount * interestTier.interestRate) / 100;
      applicableTier = interestTier;
    }
  }
  
  const finalAmount = baseAmount - discountAmount + interestAmount;
  
  return {
    daysElapsed,
    baseAmount,
    discountAmount,
    interestAmount,
    finalAmount,
    applicableTier
  };
}
```

---

### Phase 3: ACT - Controller Actions

#### 3.1 Admin Actions

##### Create/Update Discount Tier
```javascript
POST /api/admin/vendor-config/discounts
{
  periodStart: 0,
  periodEnd: 30,
  discountRate: 10
}

// Must validate against existing tiers
// Must ensure no overlap
// Must maintain sequence integrity
```

##### Create/Update Interest Tier
```javascript
POST /api/admin/vendor-config/interests
{
  periodStart: 105,
  periodEnd: 120,
  interestRate: 5
}
```

##### Create Purchase Incentive
```javascript
POST /api/admin/vendor-config/incentives
{
  title: "Bulk Purchase Bonus",
  minPurchaseAmount: 150000,
  rewardType: "bonus_credit",
  rewardValue: 5000
}
```

#### 3.2 Vendor Actions

##### Request Credit Purchase
```javascript
POST /api/vendors/credit-purchase
{
  items: [...],
  totalAmount: 75000
}

// Returns:
// - Approval status
// - Expected discount tier (if repaid early)
// - Potential interest tier (if delayed)
```

##### Submit Repayment
```javascript
POST /api/vendors/credit-repayment/:purchaseId
{
  repaymentDate: "2026-02-15"
}

// Returns calculated breakdown:
{
  daysElapsed: 25,
  baseAmount: 75000,
  discountRate: 10,
  discountAmount: 7500,
  finalPayable: 67500,
  tierApplied: "0-30 days Early Payment Discount"
}
```

##### Get Repayment Projection
```javascript
GET /api/vendors/credit-purchase/:id/repayment-projection

// Returns table showing:
// - Today: 67,500 (10% discount)
// - Day 35: 70,500 (6% discount)
// - Day 50: 72,000 (4% discount)
// - Day 110: 78,750 (5% interest)
// - Day 125: 82,500 (10% interest)
```

---

### Phase 4: DEPLOY - Integration & Testing

#### 4.1 Database Migration
```javascript
// migration-001-vendor-credit-system.js

1. Create RepaymentDiscount collection with default tiers
2. Create RepaymentInterest collection with default tiers
3. Update existing CreditRepayment documents with new fields
4. Set default Vendor.creditLimit = 200000 for existing vendors
5. Initialize Vendor.creditHistory for existing vendors
```

#### 4.2 Backward Compatibility
```javascript
// Ensure existing credit purchases still work
// Add feature flag: ENABLE_ADVANCED_CREDIT_SYSTEM

if (ENABLE_ADVANCED_CREDIT_SYSTEM) {
  // Use new discount/interest calculation
} else {
  // Use old simple penalty calculation
}
```

#### 4.3 Admin Interface Updates
- [ ] New page: Repayment Configuration
  - Discount Tiers Management (CRUD)
  - Interest Tiers Management (CRUD)
  - Visual timeline showing tiers
  - Validation alerts
  
- [ ] New page: Purchase Incentives
  - Incentive Management (CRUD)
  - Track vendor eligibility
  - Approve/deny incentive claims

---

## Critical Safety Measures

### 1. Validation Safeguards
```javascript
// Before saving any tier configuration:
async function validateTierConfiguration() {
  const allDiscounts = await RepaymentDiscount.find({ isActive: true }).sort({ periodStart: 1 });
  const allInterests = await RepaymentInterest.find({ isActive: true }).sort({ periodStart: 1 });
  
  // CHECK 1: No overlaps within same type
  checkForOverlaps(allDiscounts);
  checkForOverlaps(allInterests);
  
  // CHECK 2: Discount periods come before interest periods
  const lastDiscountEnd = Math.max(...allDiscounts.map(d => d.periodEnd));
  const firstInterestStart = Math.min(...allInterests.map(i => i.periodStart));
  
  if (lastDiscountEnd >= firstInterestStart) {
    throw new Error('Discount periods must end before interest periods begin');
  }
  
  // CHECK 3: There's a neutral zone (gap)
  if (firstInterestStart - lastDiscountEnd < 1) {
    throw new Error('There must be at least 1 day gap (neutral zone) between discounts and interests');
  }
  
  // CHECK 4: No negative or zero periods
  [...allDiscounts, ...allInterests].forEach(tier => {
    if (tier.periodStart < 0 || tier.periodEnd < 0) throw new Error('Negative periods not allowed');
    if (tier.periodStart >= tier.periodEnd) throw new Error('Period end must be after start');
  });
}
```

### 2. Transaction Safety
```javascript
// All credit operations must be atomic
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Create repayment record
  // 2. Update vendor credit used
  // 3. Update vendor credit history
  // 4. Create payment history
  // 5. Update purchase status
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### 3. Existing Functionality Preservation
```javascript
// NEVER modify these existing flows:
// - Vendor registration
// - Vendor approval
// - Order acceptance/rejection
// - Inventory management
// - Vendor earnings

// ONLY extend:
// - Credit purchase flow
// - Credit repayment flow
// - Admin configuration
```

---

## UI Rework (Phase 5 - Post Core Implementation)

### Vendor Dashboard Enhancements
1. **Credit Overview Card**
   - Credit Limit
   - Used Credit
   - Available Credit
   - Outstanding Repayments (with countdown timers)

2. **Repayment Calculator**
   - Interactive slider: "Pay today? Save ₹X"
   - Timeline view of discount/interest zones

3. **Purchase History**
   - Filter by repayment status
   - Show discount/interest earned/paid
   - Performance metrics (avg repayment time)

### Admin Dashboard Enhancements
1. **Configuration Hub**
   - Tier Management UI
   - Visual timeline editor
   - Real-time validation feedback

2. **Vendor Credit Analytics**
   - Top performing vendors (early repayers)
   - At-risk vendors (late payments)
   - Revenue from interest vs. lost revenue from discounts

---

## Testing Strategy

### Unit Tests
- [ ] Tier validation logic
- [ ] Discount calculation
- [ ] Interest calculation
- [ ] Overlap detection
- [ ] Sequence validation

### Integration Tests
- [ ] End-to-end credit purchase flow
- [ ] End-to-end repayment flow
- [ ] Admin tier creation
- [ ] Multiple vendor scenarios

### Edge Cases
- [ ] Repayment on boundary days (day 30, 60, 90, 105, 120)
- [ ] Multiple outstanding credits
- [ ] Partial repayments
- [ ] Admin changing tiers mid-cycle
- [ ] Timezone handling

---

## Rollout Plan

### Week 1: Foundation
- Create new models
- Set up database migrations
- Implement validation logic

### Week 2: Core Logic
- Implement calculation engines
- Create vendor APIs
- Create admin APIs

### Week 3: Integration
- Connect to existing flows
- Add backward compatibility
- Comprehensive testing

### Week 4: Admin UI
- Build configuration interfaces
- Add analytics dashboards
- User acceptance testing

### Week 5: Vendor UI
- Rework vendor dashboard
- Add repayment calculator
- Final integration testing

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Tier misconfiguration by admin | Multi-level validation + confirmation dialogs |
| Calculation errors | Extensive unit tests + manual verification |
| Data inconsistency | Atomic transactions + rollback capability |
| Breaking existing flows | Feature flags + regression testing |
| Performance impact | Indexed queries + caching + background jobs |

---

## Success Metrics

- [ ] Zero breaking changes to existing vendor flows
- [ ] 100% tier validation coverage
- [ ] Sub-100ms calculation performance
- [ ] Admin can create/modify tiers without developer intervention
- [ ] Vendors can project repayment amounts accurately
- [ ] All tests passing

---

**Status**: PLANNING COMPLETE - READY FOR IMPLEMENTATION  
**Next Step**: Begin Phase 1 - Model Creation
