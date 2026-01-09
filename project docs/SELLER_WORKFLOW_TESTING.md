# Seller (IRA Partner) Workflow Testing Guide

## Overview
This document outlines the testing steps for the Seller (IRA Partner) registration and login workflows.

## Prerequisites
1. Backend server running on `http://localhost:3000`
2. Frontend server running
3. MongoDB database connected
4. Admin account available for seller approval

---

## Test 1: Seller Registration Flow

### Step 1: Navigate to Registration
1. Go to `/seller/register` or click "Sign up" from login page
2. Verify the registration form is displayed with fields:
   - Full Name
   - Contact Number
   - Address
   - City
   - State
   - Pincode

### Step 2: Fill Registration Form
1. Enter valid details:
   - Full Name: "Test Seller"
   - Contact: "9876543210" (must be unique, not in User/Vendor/Seller collections)
   - Address: "123 Test Street"
   - City: "Test City"
   - State: "Test State"
   - Pincode: "123456"
2. Click "Continue"

### Expected Results:
- ✅ OTP is sent to the phone number
- ✅ Console shows: "🔐 SELLER OTP GENERATED (Registration)"
- ✅ Seller ID is generated in format: `SLR-101`, `SLR-102`, etc.
- ✅ Seller is created with `status: 'pending'`
- ✅ OTP verification screen is displayed

### Step 3: Verify OTP
1. Enter the OTP from console/backend logs
2. Click "Verify"

### Expected Results (Pending Seller):
- ✅ Pending approval screen is displayed
- ✅ Seller ID is shown on the screen
- ✅ Message: "Your account is pending admin approval"
- ✅ "Go Back to Login" button is available
- ✅ Seller data is saved in database with `status: 'pending'`

### Step 4: Admin Approval (Manual)
1. Login as Admin
2. Navigate to "IRA Partners" / "Sellers" section
3. Find the pending seller (by phone or seller ID)
4. Click "Approve"

### Expected Results:
- ✅ Seller status changes to `'approved'` in database
- ✅ Seller `isActive` is set to `true`

### Step 5: Login After Approval
1. Go to `/seller/login`
2. Enter the same phone number used in registration
3. Click "Continue"
4. Enter OTP
5. Click "Verify"

### Expected Results:
- ✅ Seller is logged in successfully
- ✅ Token is stored in `localStorage` as `seller_token`
- ✅ Context is updated with seller data
- ✅ Navigation to `/seller/dashboard` occurs
- ✅ Dashboard loads with seller data

---

## Test 2: Seller Login Flow (Approved Seller)

### Step 1: Navigate to Login
1. Go to `/seller/login`
2. Verify login form is displayed with:
   - Contact Number field
   - "Continue" button
   - "Sign up" link

### Step 2: Request OTP
1. Enter phone number of an approved seller
2. Click "Continue"

### Expected Results:
- ✅ OTP is sent to the phone number
- ✅ Console shows: "🔐 SELLER OTP GENERATED"
- ✅ OTP verification screen is displayed

### Step 3: Verify OTP
1. Enter the OTP from console/backend logs
2. Click "Verify"

### Expected Results (Approved Seller):
- ✅ Seller is logged in successfully
- ✅ Token is stored in `localStorage` as `seller_token`
- ✅ Context is updated with seller data via `AUTH_LOGIN` dispatch
- ✅ Navigation to `/seller/dashboard` occurs
- ✅ Dashboard loads with seller profile and data

### Expected Results (Pending Seller):
- ✅ Pending approval screen is displayed
- ✅ Seller ID is shown
- ✅ Message: "Your account is pending admin approval"
- ✅ "Go Back to Login" button is available
- ✅ No navigation to dashboard occurs

### Expected Results (Rejected Seller):
- ✅ Error message: "Your account has been rejected by the admin. Please contact support."
- ✅ No navigation to dashboard occurs

---

## Test 3: Edge Cases

### 3.1: Phone Number Validation
1. Try registering with a phone number that exists in:
   - User collection
   - Vendor collection
   - Another Seller collection

**Expected Results:**
- ✅ Error message indicating phone number is already in use
- ✅ Registration is blocked

### 3.2: Invalid OTP
1. Enter incorrect OTP during verification

**Expected Results:**
- ✅ Error message: "Invalid or expired OTP"
- ✅ Option to resend OTP is available

### 3.3: Expired OTP
1. Wait 5+ minutes after OTP generation
2. Try to verify OTP

**Expected Results:**
- ✅ Error message: "Invalid or expired OTP"
- ✅ Option to resend OTP is available

### 3.4: Resend OTP
1. Click "Resend OTP" during verification

**Expected Results:**
- ✅ New OTP is generated
- ✅ Previous OTP is invalidated
- ✅ Console shows new OTP

### 3.5: Suspended Seller
1. Admin suspends a seller account
2. Try to login with that seller's phone

**Expected Results:**
- ✅ Error message: "Seller account is suspended. Please contact admin."
- ✅ No navigation to dashboard occurs

---

## Test 4: Dashboard Navigation

### Step 1: Successful Login
1. Complete login flow for an approved seller
2. Verify navigation to `/seller/dashboard`

### Expected Results:
- ✅ Dashboard page loads
- ✅ Seller profile is displayed (name, seller ID)
- ✅ Context is initialized with seller data
- ✅ Dashboard data is fetched from backend:
  - Overview data
  - Wallet balance
  - Referrals
  - Performance metrics

### Step 2: Token Persistence
1. Refresh the dashboard page

**Expected Results:**
- ✅ Seller context is initialized from `localStorage` token
- ✅ Profile is fetched from backend
- ✅ Dashboard data is loaded

### Step 3: Logout
1. Click logout from dashboard

**Expected Results:**
- ✅ Token is removed from `localStorage`
- ✅ Context is cleared
- ✅ Navigation to `/seller/login` occurs

---

## Backend API Endpoints to Verify

### Registration
- `POST /api/sellers/auth/register`
  - Generates unique seller ID (SLR-XXX)
  - Creates seller with `status: 'pending'`
  - Sends OTP

### Request OTP
- `POST /api/sellers/auth/request-otp`
  - Validates phone number (checks across all collections)
  - Generates and sends OTP

### Verify OTP
- `POST /api/sellers/auth/verify-otp`
  - Verifies OTP
  - Returns token if approved
  - Returns `requiresApproval: true` if pending

### Get Profile
- `GET /api/sellers/auth/profile`
  - Returns seller profile (requires authentication)

---

## Database Verification

### Seller Collection
After registration, verify:
- ✅ `sellerId` is in format `SLR-XXX`
- ✅ `status` is `'pending'`
- ✅ `isActive` is `false`
- ✅ `phone` is unique
- ✅ `location` object contains address, city, state, pincode

After approval, verify:
- ✅ `status` is `'approved'`
- ✅ `isActive` is `true`

---

## Common Issues & Solutions

### Issue: "SellerProvider must be used within SellerProvider"
**Solution:** Ensure `SellerLogin` and `SellerRegister` are wrapped with `SellerProvider` in `App.jsx`

### Issue: Context not updating after login
**Solution:** Verify `AUTH_LOGIN` dispatch is called with correct payload after OTP verification

### Issue: Dashboard not loading after login
**Solution:** 
1. Check if token is stored in `localStorage`
2. Verify `getSellerProfile` API call succeeds
3. Check if context initialization in `SellerContext.jsx` is working

### Issue: OTP not being sent
**Solution:**
1. Check backend console for OTP generation logs
2. Verify SMS service configuration
3. In development, OTP is logged to console

---

## Test 5: Commission System Flow

### Overview
The commission system calculates and credits commissions to sellers when their referred users complete orders. Commissions are only credited when orders are **fully paid**.

### Commission Structure
- **Tier 1 (Up to ₹50,000/user/month)**: 2% commission
- **Tier 2 (Above ₹50,000/user/month)**: 3% commission
- Commission is calculated per user per month (cumulative)
- Commission is credited to seller wallet immediately upon full payment

### Step 1: Setup Test Data
1. **Seller Setup**:
   - Register and approve a seller (e.g., `SLR-101`)
   - Note the seller ID

2. **User Setup**:
   - Register a user with the seller ID linked
   - Complete user profile with delivery address

### Step 2: Test Commission Calculation - First Order (Below Threshold)
1. **Create Order**:
   - User adds products to cart (total: ₹10,000)
   - User proceeds to checkout
   - User selects "Full Payment"
   - User completes payment

2. **Expected Results**:
   - ✅ Order is created with `paymentStatus: 'fully_paid'`
   - ✅ Commission record is created in `commissions` collection:
     - `sellerId`: Seller's ObjectId
     - `sellerIdCode`: Seller's ID (e.g., `SLR-101`)
     - `userId`: User's ObjectId
     - `orderId`: Order's ObjectId
     - `orderAmount`: ₹10,000
     - `cumulativePurchaseAmount`: ₹0 (first order)
     - `newCumulativePurchaseAmount`: ₹10,000
     - `commissionRate`: 2% (below ₹50,000 threshold)
     - `commissionAmount`: ₹200 (2% of ₹10,000)
     - `status`: 'credited'
   - ✅ Seller wallet balance is updated: `wallet.balance += ₹200`
   - ✅ Console shows: `💰 Commission credited: ₹200 to seller SLR-101 for order ORD-XXXX-XXXX`

### Step 3: Test Commission Calculation - Second Order (Still Below Threshold)
1. **Create Second Order**:
   - User creates another order (total: ₹30,000)
   - User completes full payment

2. **Expected Results**:
   - ✅ Commission record is created:
     - `cumulativePurchaseAmount`: ₹10,000 (previous orders)
     - `newCumulativePurchaseAmount`: ₹40,000 (still below threshold)
     - `commissionRate`: 2%
     - `commissionAmount`: ₹600 (2% of ₹30,000)
   - ✅ Seller wallet balance increases by ₹600
   - ✅ Total wallet balance: ₹800 (₹200 + ₹600)

### Step 4: Test Commission Calculation - Threshold Crossing Order
1. **Create Third Order**:
   - User creates order (total: ₹15,000)
   - Cumulative before: ₹40,000
   - Cumulative after: ₹55,000 (crosses ₹50,000 threshold)
   - User completes full payment

2. **Expected Results**:
   - ✅ Commission record is created:
     - `cumulativePurchaseAmount`: ₹40,000
     - `newCumulativePurchaseAmount`: ₹55,000
     - `commissionRate`: 3% (entire order gets higher rate since new cumulative > threshold)
     - `commissionAmount`: ₹450 (3% of ₹15,000)
   - ✅ Seller wallet balance increases by ₹450
   - ✅ Total wallet balance: ₹1,250
   - ⚠️ **Note**: Current implementation applies the higher rate (3%) to the entire order when it crosses the threshold. A more precise calculation would apply 2% to the portion below threshold and 3% to the portion above.

### Step 5: Test Commission Calculation - Above Threshold Order
1. **Create Fourth Order**:
   - User creates order (total: ₹20,000)
   - Cumulative before: ₹55,000 (above threshold)
   - Cumulative after: ₹75,000
   - User completes full payment

2. **Expected Results**:
   - ✅ Commission record is created:
     - `cumulativePurchaseAmount`: ₹55,000
     - `newCumulativePurchaseAmount`: ₹75,000
     - `commissionRate`: 3% (entire order above threshold)
     - `commissionAmount`: ₹600 (3% of ₹20,000)
   - ✅ Seller wallet balance increases by ₹600
   - ✅ Total wallet balance: ₹1,750

### Step 6: Test Commission Display in Seller Dashboard
1. **Login as Seller**:
   - Login with approved seller credentials
   - Navigate to dashboard

2. **Check Wallet View**:
   - Navigate to "Wallet" tab
   - Verify wallet balance shows correct amount (₹1,750)
   - Verify commission transactions are listed:
     - Transaction 1: ₹200 (2%)
     - Transaction 2: ₹600 (2%)
     - Transaction 3: ₹350 (mixed rate)
     - Transaction 4: ₹600 (3%)
   - Filter by "Commission" to see only commission transactions

3. **Check Referrals View**:
   - Navigate to "Referrals" tab
   - Verify referred user is listed
   - Verify commission information is displayed:
     - Total purchases: ₹75,000
     - Commission earned: ₹1,750
     - Commission rate: 3% (current rate)

4. **Check Overview View**:
   - Navigate to "Overview" tab
   - Verify wallet balance is displayed correctly
   - Verify commission-related metrics are shown

### Step 7: Test Commission Calculation - Partial Payment Orders
1. **Create Order with Partial Payment**:
   - User creates order (total: ₹5,000)
   - User selects "Partial Payment" (30% advance)
   - User pays ₹1,500 (advance)

2. **Expected Results**:
   - ✅ Order is created with `paymentStatus: 'partial_paid'`
   - ✅ **NO commission is created** (only created on full payment)
   - ✅ Seller wallet balance remains unchanged

3. **Complete Remaining Payment**:
   - User pays remaining ₹3,500
   - Order status changes to `paymentStatus: 'fully_paid'`

4. **Expected Results**:
   - ✅ Commission record is created:
     - `orderAmount`: ₹5,000 (full order amount, not just remaining)
     - `commissionRate`: 3% (above threshold)
     - `commissionAmount`: ₹150 (3% of ₹5,000)
   - ✅ Seller wallet balance increases by ₹150

### Step 8: Test Commission Calculation - Multiple Users
1. **Register Second User**:
   - Register another user with same seller ID
   - Complete profile

2. **Create Orders for Second User**:
   - User 2 creates order (total: ₹25,000)
   - User 2 completes full payment

3. **Expected Results**:
   - ✅ Commission record is created:
     - `userId`: User 2's ObjectId
     - `cumulativePurchaseAmount`: ₹0 (separate user, separate calculation)
     - `newCumulativePurchaseAmount`: ₹25,000
     - `commissionRate`: 2% (below threshold for User 2)
     - `commissionAmount`: ₹500 (2% of ₹25,000)
   - ✅ Seller wallet balance increases by ₹500
   - ✅ Each user's commission is calculated independently

### Step 9: Test Commission Calculation - Monthly Reset
1. **Wait for Next Month** (or manually adjust dates in database):
   - Create order in new month
   - User's cumulative purchases reset for new month

2. **Expected Results**:
   - ✅ Commission calculation resets:
     - `month`: New month number
     - `year`: New year (if applicable)
     - `cumulativePurchaseAmount`: ₹0 (new month)
     - `commissionRate`: 2% (starts fresh)

### Step 10: Test Commission API Endpoints
1. **Get Wallet Details**:
   - Call `GET /api/sellers/wallet`
   - Verify response includes:
     - `balance`: Current wallet balance
     - `transactions`: Array of commission transactions

2. **Get Wallet Transactions**:
   - Call `GET /api/sellers/wallet/transactions`
   - Verify response includes:
     - `transactions`: Array with commission details
     - Each transaction shows:
       - `type`: 'commission' or 'credit'
       - `amount`: Commission amount
       - `orderId`: Related order
       - `timestamp`: When credited

3. **Get Referrals**:
   - Call `GET /api/sellers/referrals`
   - Verify response includes:
     - `referrals`: Array of referred users
     - Each referral shows:
       - `totalPurchases`: User's total purchases
       - `commissionEarned`: Commission from this user
       - `commissionRate`: Current commission rate

---

## Testing Checklist

### Registration & Login
- [ ] Registration form validation
- [ ] Unique seller ID generation (SLR-XXX)
- [ ] Phone number validation across collections
- [ ] OTP generation and sending
- [ ] OTP verification
- [ ] Pending approval screen display
- [ ] Admin approval process
- [ ] Login flow for approved sellers
- [ ] Login flow for pending sellers
- [ ] Login flow for rejected sellers
- [ ] Context update after login
- [ ] Dashboard navigation
- [ ] Token persistence
- [ ] Logout functionality
- [ ] Error handling for invalid OTP
- [ ] Error handling for expired OTP
- [ ] Resend OTP functionality

### Commission System
- [ ] Commission calculation for first order (below threshold)
- [ ] Commission calculation for orders below threshold (2%)
- [ ] Commission calculation for threshold-crossing order (mixed rate)
- [ ] Commission calculation for orders above threshold (3%)
- [ ] Commission calculation for partial payment orders (no commission until full payment)
- [ ] Commission calculation for multiple users (independent calculation)
- [ ] Commission calculation monthly reset
- [ ] Seller wallet balance update on commission credit
- [ ] Commission record creation in database
- [ ] Commission display in Wallet view
- [ ] Commission display in Referrals view
- [ ] Commission display in Overview view
- [ ] Commission API endpoints (wallet, transactions, referrals)
- [ ] Commission transaction filtering
- [ ] Commission rate accuracy (2% vs 3%)

---

## Next Steps After Testing

1. Test seller dashboard features:
   - Overview screen
   - Referrals screen
   - Wallet screen
   - Performance screen
   - Settings screen

2. Test seller-specific features:
   - Share seller ID
   - View commissions
   - Request withdrawals
   - View referrals

3. Test integration with User workflow:
   - User registration with seller ID
   - Commission calculation
   - Order tracking

4. Test Admin features:
   - View seller commissions
   - Commission reports
   - Seller performance analytics

