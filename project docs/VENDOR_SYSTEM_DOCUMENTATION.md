# Satpura Bio - Vendor/Dealer System Documentation

> **Technical Documentation v1.0**  
> Last Updated: January 7, 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Credit System](#credit-system)
3. [Product Order Cycle](#product-order-cycle)
4. [Payment Types & Workflow](#payment-types--workflow)
5. [Cash Discount System](#cash-discount-system)
6. [Interest System](#interest-system)
7. [Schemes System](#schemes-system)
8. [API Endpoints Reference](#api-endpoints-reference)
9. [Database Models Reference](#database-models-reference)

---

## System Overview

The Satpura Bio system is a B2B e-commerce platform connecting **dealers/vendors** with the **admin (Satpura Bio)**. The platform supports:

- **Credit-based ordering** for trusted dealers
- **Cash ordering** with cash discounts
- **Partial payments** (hybrid model)
- **Reward schemes** based on purchase volumes

### User Roles

| Role | Description |
|------|-------------|
| `admin` | Satpura Bio administrator - manages products, approves payments, sets credit limits |
| `user` | Dealer/Vendor - places orders, makes payments |

---

## Credit System

### How Credit Works

Every dealer is assigned a **credit limit** by the admin. This determines how much the dealer can order on credit (pay later basis).

### Credit Fields in User Model

```javascript
// User Model Fields
creditLimit: { type: Number, default: 0 }    // Maximum credit allowed
usedCredit: { type: Number, default: 0 }     // Credit currently in use
```

### Available Credit Calculation

```
Available Credit = creditLimit - usedCredit
```

### Setting Credit Limit (Admin)

**Endpoint:** `POST /admin/addCreditLimit/:userId`

**Request Body:**
```json
{
  "creditLimit": 100000
}
```

**Technical Implementation:**
```javascript
const setUserCreditLimit = async (req, res) => {
  const { creditLimit } = req.body;
  const { userId } = req.params;
  
  const user = await User.findById(userId);
  user.creditLimit = creditLimit;
  user.save();
};
```

### Credit Usage Rules

| Order Type | Credit Requirement |
|------------|-------------------|
| `credit` | 100% of order total must be within available credit |
| `partial` | 80% of order total must be within available credit |
| `cash` | No credit required (payment made upfront) |

---

## Product Order Cycle

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCT ORDER CYCLE                              │
└─────────────────────────────────────────────────────────────────────────┘

     DEALER                          SYSTEM                         ADMIN
        │                               │                              │
        │  1. Add Products to Cart      │                              │
        │ ─────────────────────────────►│                              │
        │                               │                              │
        │  2. Select Purchase Type      │                              │
        │    (cash/credit)              │                              │
        │  + Payment Period (days)      │                              │
        │ ─────────────────────────────►│                              │
        │                               │                              │
        │                               │ 3. Calculate:                │
        │                               │    - Cash Discount           │
        │                               │    - Interest (if credit)    │
        │                               │    - Final Price             │
        │                               │                              │
        │  4. Place Order               │                              │
        │ ─────────────────────────────►│                              │
        │                               │                              │
        │                   ┌───────────┴───────────┐                  │
        │                   │                       │                  │
        │             Cash/Partial            Full Credit              │
        │                   │                       │                  │
        │         Make UPI Payment          Use Credit Limit          │
        │                   │                       │                  │
        │                   ▼                       ▼                  │
        │           Order: draft            Order: orderReceived       │
        │           Payment: pendingApproval Payment: pendingPayment   │
        │                   │                       │                  │
        │                   │                       │                  │
        │                   └───────────┬───────────┘                  │
        │                               │                              │
        │                               │ 5. Payment Approval          │
        │                               │ ─────────────────────────────►
        │                               │                              │
        │                               │                   6. Approve │
        │                               │ ◄─────────────────────────────
        │                               │                              │
        │                               │ 7. Update Order Status       │
        │                               │    to "inProgress"           │
        │                               │                              │
        │  8. Order Fulfillment         │                              │
        │ ◄─────────────────────────────│                              │
        │                               │                              │
```

### Order Statuses

| Status | Description |
|--------|-------------|
| `draft` | Order created, awaiting payment approval |
| `orderReceived` | Order confirmed (credit orders start here) |
| `inProgress` | Order being processed |
| `qualityCheck` | Products under quality verification |
| `outForDelivery` | Order dispatched |
| `orderDelivered` | Order completed |

### Payment Statuses

| Status | Description |
|--------|-------------|
| `pendingPayment` | Awaiting payment from dealer |
| `pendingApproval` | Payment made, awaiting admin approval |
| `paymentApproved` | Payment verified by admin |
| `paidInFull` | All dues cleared |

---

## Payment Types & Workflow

### 1. Cash Order (Full Payment)

**Flow:**
1. Dealer adds products to cart with `purchaseType: "cash"`
2. Selects payment period (e.g., 0 days for immediate)
3. System calculates **cash discount** based on payment period
4. Dealer makes UPI payment and submits reference number
5. Admin verifies and approves payment
6. Order moves to `inProgress`

**Benefits:**
- Receives maximum cash discount for early payment
- No interest charges
- Faster order processing

### 2. Credit Order (Pay Later)

**Flow:**
1. Dealer adds products to cart with `purchaseType: "credit"`
2. Selects payment period (e.g., 30, 60, 90 days)
3. System checks if dealer has sufficient credit limit
4. If approved, order is placed using credit
5. `usedCredit` increases by order amount
6. Dealer pays later within the payment period

**Code Logic:**
```javascript
// Credit limit validation
if (orderType === "credit" && (user.creditLimit - user.usedCredit) < totalPayableAmount) {
  return res.status(400).json({ message: "Insufficient credit limit" });
}

// Update used credit after order
if (orderType === "credit" || orderType === "partial") {
  user.usedCredit += totalPayableAmount;
  await user.save();
}
```

### 3. Partial Order (Hybrid)

**Flow:**
1. Dealer makes partial upfront payment (minimum 20% implied)
2. Remaining 80% goes on credit
3. Admin approves the upfront payment
4. Order proceeds

**Code Logic:**
```javascript
if (orderType === "partial") {
  const creditLimitNeeded = totalPayableAmount * 0.8; // 80% of total
  if ((user.creditLimit - user.usedCredit) < creditLimitNeeded) {
    return res.status(400).json({ message: "Insufficient credit limit for partial order" });
  }
}
```

---

## Cash Discount System

### Overview

Cash discounts incentivize dealers to pay early. The earlier the payment, the higher the discount.

### Cash Discount Model

```javascript
const cashDiscountSchema = new mongoose.Schema({
  paymentStart: { type: Number, required: true },  // Start of period (days)
  paymentEnd: { type: Number, required: true },    // End of period (days)
  discount: { type: Number, required: true },      // Discount percentage
});
```

### Example Timeline

| Payment Period | Discount |
|----------------|----------|
| 0-7 days | 5% |
| 8-15 days | 3% |
| 16-30 days | 1% |
| 31+ days | 0% |

### Discount Calculation Logic

```javascript
// Fetch applicable cash discount based on payment period
const cashDiscount = await CashDiscount.findOne({
  paymentStart: { $lte: paymentPeriod },
  paymentEnd: { $gte: paymentPeriod }
});

if (cashDiscount) {
  discountValue = cashDiscount.discount; // Percentage
}

// Apply discount
const discountedPrice = originalPrice - (discountValue / 100 * originalPrice);
```

### Admin Configuration

Admins can configure cash discount slabs via the Admin Dashboard:
- **Route:** `/admindashboard/cash-discounts`
- **Component:** `CashDiscounts.jsx`

---

## Interest System

### Overview

Interest is charged on credit purchases to compensate for delayed payment. The longer the payment period, the higher the interest.

### Interest Model

```javascript
const interestSchema = new mongoose.Schema({
  paymentStart: { type: Number, required: true },  // Start of period (days)
  paymentEnd: { type: Number, required: true },    // End of period (days)
  interest: { type: Number, required: true },      // Interest percentage per month
});
```

### Example Timeline

| Payment Period | Interest (Monthly) |
|----------------|-------------------|
| 0-30 days | 0% |
| 31-60 days | 1.5% |
| 61-90 days | 2% |
| 91+ days | 2.5% |

### Interest Calculation Logic

```javascript
// Fetch applicable interest based on payment period
const interest = await Interest.findOne({
  paymentStart: { $lte: paymentPeriod },
  paymentEnd: { $gte: paymentPeriod }
});

if (interest) {
  interestValue = interest.interest; // Percentage per month
}

// Calculate interest for delayed payments
let totalInterest = 0;
if (interestValue > 0) {
  const interestStartPeriod = interest.paymentStart;
  const daysDelayed = paymentPeriod - interestStartPeriod;
  const monthsDelayed = Math.ceil(daysDelayed / 30);

  if (daysDelayed > 0) {
    totalInterest = (interestValue / 100) * discountedPrice * monthsDelayed;
  }
}

// Final price after discount and interest
const finalPrice = discountedPrice + totalInterest;
```

### Admin Configuration

Admins can configure interest slabs via the Admin Dashboard:
- **Route:** `/admindashboard/interest`
- **Component:** `Interests.jsx`

---

## Schemes & Incentive System (Phase 6)

### Overview

The Incentive System (Phase 6) automates rewards based on purchase volume milestones. Unlike the manual scheme tracking, this system automatically qualifies vendors when their approved purchase amount crosses defined thresholds.

### Incentive Model (`PurchaseIncentive`)

```javascript
{
  title: { type: String, required: true },
  description: { type: String, required: true },
  rewardType: { 
    type: String, 
    enum: ['voucher', 'smartwatch', 'membership', 'percentage_discount', 'custom'] 
  },
  rewardValue: mongoose.Schema.Types.Mixed, // Value of the reward
  minPurchaseAmount: { type: Number, required: true }, // Milestone threshold
  validFrom: { type: Date, default: Date.now },
  validUntil: Date,
  isActive: { type: Boolean, default: true }
}
```

### Earned Rewards Model (`VendorIncentiveHistory`)

```javascript
{
  vendor: { type: ObjectId, ref: 'Vendor', required: true },
  incentive: { type: ObjectId, ref: 'PurchaseIncentive', required: true },
  purchase: { type: ObjectId, ref: 'VendorPurchase' }, // Triggering purchase
  status: { 
    type: String, 
    enum: ['pending_approval', 'approved', 'claimed_by_vendor', 'dispatched', 'delivered', 'rejected'],
    default: 'pending_approval'
  },
  earnedAt: { type: Date, default: Date.now },
  claimedAt: Date,
  incentiveSnapshot: Object // Copy of incentive details for historical record
}
```

### Automation Workflow

1.  **Order Approval**: When an admin approves a vendor's purchase (`POST /api/admin/purchases/:purchaseId/approve`), the `incentiveService` is triggered.
2.  **Qualification Check**: The system checks if the total approved purchase amount (within validity periods) crosses any active incentive `minPurchaseAmount`.
3.  **Reward Generation**: If qualified, a `VendorIncentiveHistory` record is created in `pending_approval` status.
4.  **Admin Review**: Admins review and approve rewards via the **Incentive Config** page in the Admin Dashboard.
5.  **Vendor Claim**: Vendors see their earned rewards in the **Rewards** tab of the Vendor Console and can formally "Claim" them.

### Vendor Experience

Vendors interact with the incentive system through:
- **Rewards Widget**: dashboard overview showing next milestones.
- **Milestones Tab**: Detailed view of all active reward campaigns.
- **History Tab**: List of all earned, pending, and claimed rewards.


### Admin Scheme Approval

When admin approves a scheme reward:

1. **Endpoint:** `POST /scheme/reward/add`
2. **Request Body:**
   ```json
   {
     "userId": "dealer_id",
     "schemeId": "scheme_id"
   }
   ```
3. **Actions:**
   - Creates a `UserReward` record
   - Updates user's `availedScheme` field
   - Marks reward as ready for distribution

---

## API Endpoints Reference

### Order Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/order` | Create new order |
| GET | `/order/user/:userId` | Get orders for a user |
| GET | `/order/all` | Get all orders (admin) |
| POST | `/order/payment/approve` | Approve payment by admin |
| POST | `/order/payment/reject` | Reject payment by admin |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/order/payment` | Add payment (UPI reference) |
| GET | `/order/payments` | Get all payments |
| GET | `/order/payments/:userId` | Get payments for user |

### Scheme Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scheme/all` | Get all schemes |
| GET | `/scheme/:id` | Get scheme by ID |
| POST | `/scheme/add` | Create new scheme |
| DELETE | `/scheme/:id` | Delete scheme |
| GET | `/scheme/users/qualified` | Get users qualified for schemes |
| POST | `/scheme/reward/add` | Approve and add user reward |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/addCreditLimit/:userId` | Set user credit limit |
| POST | `/admin/approveCustomer` | Approve customer account |
| POST | `/admin/rejectCustomer` | Reject customer account |

### Cart Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/cart/add` | Add product to cart |
| GET | `/cart/:userId` | Get user's cart |
| POST | `/cart/remove` | Remove product from cart |
| POST | `/cart/increase` | Increase product quantity |
| POST | `/cart/decrease` | Decrease product quantity |

---

## Database Models Reference

### User Model (Dealer)

```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  phone: Number,
  creditLimit: Number,        // Credit limit set by admin
  usedCredit: Number,         // Currently used credit
  totalSpent: Number,         // Total approved payments
  shopName: String,
  shopOwnerName: String,
  shopAddress: String,
  gstNumber: String,
  panNumber: String,
  aadharNumber: String,
  customerAccess: Boolean,    // Account approved by admin
  availedScheme: ObjectId,    // Reference to availed scheme
}
```

### Order Model

```javascript
{
  orderId: String,
  customer: ObjectId,         // Reference to User
  orderType: String,          // "cash", "credit", or "partial"
  products: [{
    product: ObjectId,
    quantity: Number,
    cashDiscount: Number,     // Discount percentage applied
    interest: Number,         // Interest percentage applied
    dueDate: Date,            // Payment due date
    dueAmount: Number,        // Amount still due
  }],
  address: ObjectId,
  cashDiscount: Number,       // Total discount amount
  interest: Number,           // Total interest amount
  totalAmount: Number,
  amountPaid: Number,
  amountRemaining: Number,
  paymentHistory: [ObjectId], // References to Payment records
  orderStatus: String,
  paymentStatus: String,
  deliveryDate: Date,
}
```

### Payment Model

```javascript
{
  paymentId: String,
  customer: ObjectId,
  order: ObjectId,
  amount: Number,
  status: String,              // "pending", "approved", "rejected"
  paymentMethod: String,       // "UPI", "Razorpay", etc.
  upiRefNumber: String,        // UPI reference for verification
  approved: Boolean,
  approvedAmount: Number,      // Amount approved by admin
}
```

### Hisaab Model (Account Summary)

```javascript
{
  userId: ObjectId,
  totalCreditLimit: Number,
  usedCreditLimit: Number,
  availableCreditLimit: Number,
  overdue: Number,             // Overdue payments
  upcomingPayment: [{
    payment: ObjectId,
    order: ObjectId,
    amount: Number,
  }],
  totalOutstanding: Number,
}
```

---

## Summary: Complete Order Flow Example

### Scenario: Dealer places ₹50,000 credit order with 60-day payment period

1. **Add to Cart:**
   - Product price: ₹50,000
   - Payment period: 60 days
   - Cash discount (0-30 days): 0% (not applicable)
   - Interest (31-60 days): 1.5% per month = ₹750

2. **Final Price Calculation:**
   ```
   Original Price:     ₹50,000
   Cash Discount:      -₹0 (not within discount period)
   Interest (2 months): +₹1,500
   ─────────────────────────────
   Final Price:        ₹51,500
   ```

3. **Credit Check:**
   ```
   Dealer's Credit Limit:  ₹1,00,000
   Used Credit:            ₹30,000
   Available Credit:       ₹70,000
   Order Amount:           ₹51,500
   ✅ Sufficient credit available
   ```

4. **Order Created:**
   - Order Status: `orderReceived`
   - Payment Status: `pendingPayment`
   - Due Date: 60 days from order date
   - User's `usedCredit` updated to ₹81,500

5. **Payment Made Within 60 Days:**
   - Dealer makes UPI payment
   - Submits reference number
   - Admin verifies and approves
   - Payment Status: `paymentApproved`
   - User's `totalSpent` increases by ₹51,500
   - User's `usedCredit` restored

6. **Scheme Qualification Check:**
   - If `totalSpent` crosses a scheme slab
   - Admin reviews and approves reward
   - Dealer receives benefit

---


*Document generated from codebase analysis of Satpura-Backend and Satpura-Admin*
