# Payment and Earnings Distribution Logic

## Overview
This document outlines the complete payment flow and earnings distribution system for the IRA SATHI platform, including withdrawal request mechanisms for Vendors and Sellers.

---

## 1. Payment Flow

### 1.1 User Payment to Admin
- **When**: User completes an order and makes payment
- **Flow**: 
  - User payment → Admin account/wallet
  - Admin holds the entire payment amount
  - Order status updates to "Payment Received" or similar
- **Storage**: 
  - Payment record stored with order
  - Admin balance/wallet updated
  - Payment status tracked in order

### 1.2 Payment Distribution
- **Trigger**: Admin manually distributes payments (or automated based on order status)
- **Distribution**:
  - **Vendor Earnings**: Calculated based on price difference (User Price - Vendor Price)
  - **Seller Commission**: Calculated based on commission rate (2% or 3% of order amount)
  - **Admin**: Remaining amount after vendor and seller payouts

---

## 2. Earnings Calculation

### 2.1 Vendor Earnings
- **Formula**: `Vendor Earnings = (User Price - Vendor Price) × Quantity`
- **Per Order**: Each order item contributes to vendor earnings
- **Accumulation**: 
  - Earnings accumulate in vendor's account
  - Tracked per order
  - Monthly/yearly totals available

### 2.2 Seller Earnings (Commission)
- **Formula**: 
  - If monthly purchases < ₹50,000: `Commission = Order Amount × 2%`
  - If monthly purchases >= ₹50,000: `Commission = Order Amount × 3%`
- **Per Order**: Commission calculated at order completion
- **Accumulation**:
  - Commission accumulates in seller's wallet
  - Tracked per order and per user
  - Monthly totals available

---

## 3. Vendor Earnings Interface

### 3.1 Dashboard/Overview
- **Total Earnings**: Lifetime total earnings
- **Pending Earnings**: Earnings not yet withdrawn
- **Available Balance**: Amount available for withdrawal
- **This Month Earnings**: Current month's earnings
- **Earnings History**: List of all earnings with order details

### 3.2 Earnings Details
- **Per Order Breakdown**:
  - Order number
  - Product name
  - Quantity
  - User price
  - Vendor price
  - Earnings per item
  - Total earnings from order
  - Date
- **Time Period Filters**: 
  - Today
  - This Week
  - This Month
  - This Year
  - Custom Date Range

### 3.3 Earnings Summary Cards
- Total Earnings (Lifetime)
- Available Balance
- Pending Withdrawal
- This Month Earnings
- Last Withdrawal Date

---

## 4. Seller Earnings Interface

### 4.1 Dashboard/Overview
- **Total Commission**: Lifetime total commission earned
- **Available Balance**: Commission available for withdrawal
- **Pending Withdrawal**: Amount in pending withdrawal requests
- **This Month Commission**: Current month's commission
- **Commission Breakdown**: By rate (2% vs 3%)

### 4.2 Commission Details
- **Per Order Breakdown**:
  - Order number
  - User name
  - Order amount
  - Commission rate (2% or 3%)
  - Commission amount
  - Date
- **Per User Breakdown**:
  - User name
  - Monthly purchases
  - Commission rate applied
  - Total commission from user
- **Time Period Filters**: 
  - Today
  - This Week
  - This Month
  - This Year
  - Custom Date Range

### 4.3 Commission Summary Cards
- Total Commission (Lifetime)
- Available Balance
- Pending Withdrawal
- This Month Commission
- Users at 2% rate
- Users at 3% rate

---

## 5. Withdrawal Request System

### 5.1 Vendor Withdrawal Conditions
- **Minimum Withdrawal Amount**: To be defined (e.g., ₹1,000)
- **Available Balance**: Must have sufficient balance
- **Account Verification**: Vendor account must be verified/active
- **Bank Details**: Must have bank account details added
- **Pending Orders**: No pending withdrawal requests

### 5.2 Seller Withdrawal Conditions
- **Minimum Withdrawal Amount**: To be defined (e.g., ₹500)
- **Available Balance**: Must have sufficient balance
- **Account Verification**: Seller account must be verified/active
- **Bank Details**: Must have bank account details added
- **Pending Orders**: No pending withdrawal requests

### 5.3 Withdrawal Request Flow

#### For Vendor/Seller:
1. **Request Withdrawal**:
   - Navigate to Earnings/Wallet section
   - Click "Request Withdrawal"
   - Enter withdrawal amount
   - Select bank account (if multiple)
   - Submit request
   - Request status: "Pending"

2. **Request Status**:
   - **Pending**: Awaiting admin approval
   - **Approved**: Admin approved, processing payment
   - **Completed**: Payment processed successfully
   - **Rejected**: Request rejected by admin (with reason)

3. **Request History**:
   - View all past withdrawal requests
   - Filter by status
   - View details (amount, date, status, remarks)

#### For Admin:
1. **View Requests**:
   - Dashboard showing pending withdrawal requests
   - Filter by Vendor/Seller
   - Filter by amount range
   - Filter by date

2. **Request Details**:
   - Vendor/Seller information
   - Requested amount
   - Available balance
   - Bank account details
   - Request date
   - Previous withdrawal history

3. **Actions**:
   - **Approve**: Approve the request
     - Update request status to "Approved"
     - Deduct amount from vendor/seller balance
     - Create payment record
     - Send notification to vendor/seller
   - **Reject**: Reject the request
     - Update request status to "Rejected"
     - Add rejection reason
     - Send notification to vendor/seller
   - **Process Payment**: Mark as completed after payment
     - Update request status to "Completed"
     - Record payment transaction details
     - Send confirmation to vendor/seller

---

## 6. Admin Interface for Withdrawal Management

### 6.1 Withdrawal Requests Dashboard
- **Pending Requests**: List of all pending withdrawal requests
- **Quick Stats**:
  - Total pending amount
  - Number of pending requests
  - Today's requests
  - This week's requests

### 6.2 Request Management
- **Request List View**:
  - Vendor/Seller name
  - Requested amount
  - Available balance
  - Request date
  - Status
  - Actions (Approve/Reject/View Details)

- **Request Detail View**:
  - Vendor/Seller profile
  - Earnings summary
  - Bank account details
  - Request history
  - Approve/Reject actions
  - Add remarks/notes

### 6.3 Bulk Actions
- **Bulk Approve**: Approve multiple requests at once
- **Bulk Reject**: Reject multiple requests at once
- **Export**: Export requests to CSV/Excel

### 6.4 Payment Processing
- **Payment Methods**: 
  - Bank transfer
  - UPI
  - Other methods (to be defined)
- **Payment Records**:
  - Track all processed payments
  - Payment reference number
  - Payment date
  - Payment method
  - Status

---

## 7. Database Schema Requirements

### 7.1 Vendor Earnings
```javascript
VendorEarning {
  vendorId: ObjectId,
  orderId: ObjectId,
  productId: ObjectId,
  quantity: Number,
  userPrice: Number,
  vendorPrice: Number,
  earnings: Number,
  status: String, // 'pending', 'processed', 'withdrawn'
  createdAt: Date,
  processedAt: Date
}
```

### 7.2 Seller Commission
```javascript
Commission {
  sellerId: ObjectId,
  userId: ObjectId,
  orderId: ObjectId,
  orderAmount: Number,
  commissionRate: Number, // 2 or 3
  commissionAmount: Number,
  month: Number,
  year: Number,
  status: String, // 'pending', 'processed', 'withdrawn'
  createdAt: Date,
  processedAt: Date
}
```

### 7.3 Withdrawal Request
```javascript
WithdrawalRequest {
  vendorId: ObjectId, // or sellerId
  userType: String, // 'vendor' or 'seller'
  requestedAmount: Number,
  availableBalance: Number,
  bankAccountId: ObjectId,
  status: String, // 'pending', 'approved', 'rejected', 'completed'
  adminId: ObjectId, // Admin who processed
  adminRemarks: String,
  rejectionReason: String,
  paymentReference: String,
  paymentMethod: String,
  paymentDate: Date,
  requestedAt: Date,
  processedAt: Date
}
```

### 7.4 Bank Account Details
```javascript
BankAccount {
  userId: ObjectId,
  userType: String, // 'vendor' or 'seller'
  accountHolderName: String,
  accountNumber: String,
  ifscCode: String,
  bankName: String,
  branchName: String,
  isPrimary: Boolean,
  isVerified: Boolean,
  createdAt: Date
}
```

---

## 8. API Endpoints Required

### 8.1 Vendor Earnings
- `GET /api/vendors/earnings` - Get vendor earnings summary
- `GET /api/vendors/earnings/history` - Get earnings history
- `GET /api/vendors/earnings/orders` - Get earnings by orders
- `GET /api/vendors/balance` - Get available balance

### 8.2 Seller Commission
- `GET /api/sellers/commission` - Get commission summary
- `GET /api/sellers/commission/history` - Get commission history
- `GET /api/sellers/commission/orders` - Get commission by orders
- `GET /api/sellers/balance` - Get available balance

### 8.3 Withdrawal Requests
- `POST /api/vendors/withdrawals/request` - Create withdrawal request (Vendor)
- `POST /api/sellers/withdrawals/request` - Create withdrawal request (Seller)
- `GET /api/vendors/withdrawals` - Get withdrawal history (Vendor)
- `GET /api/sellers/withdrawals` - Get withdrawal history (Seller)
- `GET /api/admin/withdrawals` - Get all withdrawal requests (Admin)
- `PUT /api/admin/withdrawals/:id/approve` - Approve withdrawal request
- `PUT /api/admin/withdrawals/:id/reject` - Reject withdrawal request
- `PUT /api/admin/withdrawals/:id/complete` - Mark payment as completed

### 8.4 Bank Account Management
- `POST /api/vendors/bank-accounts` - Add bank account (Vendor)
- `POST /api/sellers/bank-accounts` - Add bank account (Seller)
- `GET /api/vendors/bank-accounts` - Get bank accounts (Vendor)
- `GET /api/sellers/bank-accounts` - Get bank accounts (Seller)
- `PUT /api/vendors/bank-accounts/:id` - Update bank account (Vendor)
- `PUT /api/sellers/bank-accounts/:id` - Update bank account (Seller)
- `DELETE /api/vendors/bank-accounts/:id` - Delete bank account (Vendor)
- `DELETE /api/sellers/bank-accounts/:id` - Delete bank account (Seller)

---

## 9. Frontend Components Required

### 9.1 Vendor Dashboard
- Earnings Overview Card
- Earnings History Table
- Earnings by Order List
- Withdrawal Request Form
- Withdrawal History
- Bank Account Management

### 9.2 Seller Dashboard
- Commission Overview Card
- Commission History Table
- Commission by Order List
- Commission by User List
- Withdrawal Request Form
- Withdrawal History
- Bank Account Management

### 9.3 Admin Dashboard
- Withdrawal Requests List
- Withdrawal Request Detail View
- Approve/Reject Actions
- Payment Processing Interface
- Vendor Earnings Overview
- Seller Commission Overview

---

## 10. Notification System

### 10.1 Vendor Notifications
- Earnings credited notification
- Withdrawal request approved
- Withdrawal request rejected
- Payment processed

### 10.2 Seller Notifications
- Commission credited notification
- Withdrawal request approved
- Withdrawal request rejected
- Payment processed

### 10.3 Admin Notifications
- New withdrawal request received
- Payment processing reminder

---

## 11. Implementation Priority

### Phase 1: Core Earnings Calculation
1. Vendor earnings calculation on order completion
2. Seller commission calculation on order completion
3. Earnings/Commission storage in database

### Phase 2: Earnings Display
1. Vendor earnings interface
2. Seller commission interface
3. Earnings history and breakdown

### Phase 3: Withdrawal System
1. Bank account management
2. Withdrawal request creation
3. Admin withdrawal management interface

### Phase 4: Payment Processing
1. Admin payment processing
2. Payment tracking
3. Notifications

---

## 12. Security Considerations

1. **Balance Verification**: Ensure withdrawal amount doesn't exceed available balance
2. **Duplicate Requests**: Prevent multiple pending requests from same user
3. **Admin Authorization**: Only authorized admins can approve/reject requests
4. **Bank Account Verification**: Verify bank account details before processing
5. **Audit Trail**: Log all withdrawal requests and approvals
6. **Payment Confirmation**: Require payment reference for completed withdrawals

---

## 13. Testing Scenarios

1. Vendor earns from order with price difference
2. Seller earns commission at correct rate (2% vs 3%)
3. Withdrawal request creation with valid/invalid amounts
4. Admin approval/rejection flow
5. Balance deduction on approval
6. Payment processing and completion
7. Multiple withdrawal requests handling
8. Bank account management
9. Earnings history accuracy
10. Commission calculation accuracy

---

## Notes for Implementation

- Ensure all calculations are accurate and tested
- Implement proper error handling for insufficient balance
- Add validation for minimum withdrawal amounts
- Implement proper state management for withdrawal requests
- Add loading states and error messages in UI
- Ensure responsive design for all interfaces
- Add proper logging for audit purposes
- Consider implementing automated payment processing in future
- Add export functionality for earnings/commission reports

---

**Document Version**: 1.0  
**Created**: Today  
**Last Updated**: Today  
**Status**: Ready for Implementation

