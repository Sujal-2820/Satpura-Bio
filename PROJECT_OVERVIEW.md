# IRA SATHI - Project Overview & System Documentation

## System Overview

**IRA SATHI** is a comprehensive fertilizer management ecosystem that connects four core entities to streamline the distribution and purchase of fertilizers, ensuring efficient operations from head office to end users.

### Core Entities

1. **Admin (Head Office)** - Central management and oversight
2. **Vendors (Local Distributors)** - Regional distributors (1 per 20km radius)
3. **Sellers (Field Agents / Seller Boys)** - On-ground sales representatives
4. **Users (Farmers or Retail Buyers)** - End consumers purchasing fertilizers

### System Objectives

The system ensures that:

- Users can easily purchase fertilizers online
- Sellers get credited when their referred users purchase
- Vendors manage local stock, credit, and distribution
- Admin oversees everything—stock, payments, credits, vendors, and performance

---

## Client Suggestions & New Requirements

1. **User Checkout Enhancements**
   - Add an explicit option in the User Dashboard checkout to pay **100% of the total amount** upfront.
   - When the 100% payment option is selected, **delivery charges become free** for that order and the checkout must proceed with the full advance payment.
   - All other orders continue to follow the existing 30% / 70% split flow.

2. **Dashboard Header Styling**
   - Update the header backgrounds across **User, Vendor, and IRA Partner (Seller)** dashboards to use a **solid green color (shpould be slightly light in shade)**.
   - Make the elements inside the header, **light colored** so that they are visible in Dark background as well.


3. **Brand Logo Watermark**
   - Create a **very light / low-contrast** version of the brand logo.
   - Display this watermark **centered horizontally and vertically** on every possible screen and view inside all dashboards (User, Vendor, IRA Partner).
   - The watermark should remain subtle so it reinforces branding without distracting from primary UI elements.

4. **Terminology Update**
   - Replace the user-facing term **“Seller”** with **“IRA Partner”** throughout the dashboards, documentation, and communications to align with the new branding directive.

5. **IRA Partner Commission Rules**
   - At the start of each month, the **purchase tally for every user linked to an IRA Partner ID resets to zero**.
   - Commission is calculated **per connected user per month** using the following slabs:
     - **Up to ₹50,000 cumulative purchases** (within the month): IRA Partner earns **2% commission** on that user’s purchase total.
     - **Above ₹50,000 cumulative purchases** (within the month): IRA Partner earns **3% commission** on that user’s purchase total once the threshold is crossed.
   - Every purchase made by a connected user contributes to the month’s tally, regardless of whether purchases happen in a single order or multiple orders.

6. **Delivery Policy Adjustments**
   - Standard delivery cost is now **static at ₹50**, with **no express delivery option**.
   - Normal delivery must be completed **within 24 hours**.
   - Orders where users opt for **100% upfront payment** automatically receive **free delivery** (see Suggestion 1).

7. **Vendor Coverage & Assignment**
   - Reinforce the geographic rule that within any **20 km radius there can be only one vendor**.
   - Ensure the system prevents overlapping coverage areas or two vendors operating within the same 20 km range.

8. **Vendor Order Status Workflow**
   - Vendors must **manually update the status** of every order they handle using the states: **Awaiting**, **Dispatched**, and **Delivered**.
   - These status updates must be **persisted** and surfaced in the **User Dashboard** so users can see the live status of their specific orders.

---

## User Application Flow

### Step 1: Onboarding & Authentication

1. User downloads IRA SATHI mobile app
2. User opens app → shown language selection screen (English / Hindi / etc.) powered by **Google Translator API**
3. User proceeds to OTP-based login:
   - Enters mobile number
   - Receives OTP (via Firebase / SMS API)
   - Logs in successfully
4. User can optionally enter a **Seller ID** (shared by the local seller boy)
   - If entered, all purchases under this ID are linked for cashback to that seller
   - Seller ID gets stored in user's profile

### Step 2: Dashboard & Product Browsing

1. User lands on the Home screen with:
   - Categories (e.g., Organic, Chemical, Seeds, Insecticides, etc.)
   - Highlighted offers and popular products
2. User selects a category → views product list
3. Each product card displays:
   - Name, Price, Description, Stock Status, Vendor Name/Location
4. User taps a product → navigates to Product Details page showing:
   - Image, available stock, delivery timeline (3hr / 4hr / 1 day – set by Admin), and Add to Cart option

### Step 3: Add to Cart & Checkout

1. User adds products to cart
2. System checks minimum order value (**₹2,000**):
   - If below ₹2,000 → shows alert "Minimum order value is ₹2,000."
3. At checkout:
   - System fetches assigned Vendor based on user's location (20 km radius rule)
   - If vendor is available and has stock → order goes to that vendor
   - If vendor doesn't have stock → order automatically forwards to Admin stock
4. User proceeds to payment:
   - **30% advance payment** required before confirming the order
   - **70% payment** scheduled post-delivery (via link or auto-reminder)

### Step 4: Payment Gateway

1. System integrates **Razorpay/Paytm/Stripe**
2. User pays 30% amount → transaction verified → order confirmed
3. Payment status = "Partial Paid"

### Step 5: Order Assignment & Partial Fulfillment

1. Backend verifies stock from vendor for each item in the order:
   - **Full Availability**: If vendor has all items in stock → vendor receives order notification → vendor accepts and fulfills
   - **No Availability**: If vendor doesn't have any items → vendor marks "Not Available" with reason → entire order escalated to Admin
   - **Partial Availability**: If vendor has some items but not all:
     - Vendor can accept items that are in stock (sufficient quantity)
     - Vendor rejects items that are out of stock or insufficient quantity
     - System automatically splits the order:
       - **Vendor Order**: Items accepted by vendor (vendor fulfills from local stock)
       - **Admin Order**: Items rejected/escalated (admin fulfills from master warehouse)
     - Both orders are tracked separately but linked to the original order
     - User receives notification about partial fulfillment with details of which items will come from vendor and which from admin
2. Admin arranges delivery via master warehouse for escalated items
3. User may receive deliveries from both vendor and admin separately, or combined delivery can be arranged

### Step 6: Order Delivery & Remaining Payment

1. Delivery scheduled as per admin-set timing (3 hr, 4 hr, 1 day)
2. After delivery confirmation, user receives notification for remaining 70% payment
3. User completes balance payment → order marked "Fully Paid & Delivered"
4. Seller ID linked to the order → cashback credited to seller's wallet (see Seller Panel flow)

### Step 7: Post-Order Features

User can track:
- Order History
- Payment Status (Advance / Remaining)
- Delivery Status
- User can raise issue via Support Chat / Call

Push Notifications for:
- Payment reminder
- Delivery updates
- Offers or announcements

---

## Vendor Panel Flow (Distributor)

### Step 1: Vendor Registration

1. Vendor applies through website or Admin directly registers them
2. Vendor location verified using **Google Maps API**
3. Only **1 vendor allowed per 20 km radius**
4. Vendor account approved by Admin and login credentials shared

### Step 2: Vendor Dashboard

Main sections:
- Orders
- Inventory
- Purchase from Admin
- Credit Management
- Reports

### Step 3: Inventory Management

1. Vendor sees all fertilizers assigned to them by Admin
2. Can view:
   - Current stock quantity
   - Purchase price from Admin
   - Selling price to users
3. Vendor can update stock quantities manually after physical deliveries

### Step 4: Order Management

1. When user in vendor's region places an order:
   - Vendor receives notification
   - Vendor checks stock availability for each item in the order
2. Vendor options:
   - **"Available"** → accepts entire order → arranges delivery
   - **"Not Available"** → rejects entire order with reason → System redirects order to Admin for fulfillment
   - **"Partial Acceptance"** → Vendor can accept some items and reject others:
     - Items that vendor has in stock (sufficient quantity) → Vendor fulfills those items
     - Items that vendor doesn't have (or insufficient quantity) → Those items are automatically escalated to Admin
     - System splits the order into two parts:
       - **Vendor Order**: Items accepted by vendor (vendor fulfills)
       - **Admin Order**: Items rejected/escalated to admin (admin fulfills from master warehouse)
     - User receives notification about partial fulfillment
     - Both orders are tracked separately but linked to the original order
3. Vendor updates order status:
   - Accepted → Processing → Delivered (for vendor-fulfilled items)
4. Vendor can see payment status (advance received / pending balance)

### Step 5: Purchase from Admin

1. If vendor stock is low, they can reorder from Admin:
   - Minimum purchase value **₹50,000**
   - Purchase type: "Credit Order"
2. Once request placed:
   - Admin verifies order → approves or rejects
   - Vendor receives fertilizer stock entry in inventory
   - Credit balance increases

### Step 6: Credit Management System

1. Each vendor has a credit limit and repayment time set by Admin
2. If vendor delays payment:
   - Credit points reduce daily based on penalty rate defined by Admin
   - After expiry, vendor restricted from new purchases until cleared
3. Vendor dashboard shows:
   - Credit limit
   - Remaining amount
   - Penalty status
   - Due date reminders

### Step 7: Reports & Insights

Vendor dashboard displays:
- Total Orders (daily/weekly/monthly)
- Total Sales & Revenue
- Credit Purchase Summary
- Payment History
- User Region Analytics (20km coverage)

---

## Seller Panel Flow (Field Agent)

### Step 1: Seller Registration

1. Seller created by Admin with:
   - Unique Seller ID (e.g., SLR-1001)
   - Name, contact info, village area
   - Monthly sales target and commission rate
2. Seller logs in using provided credentials

### Step 2: Dashboard Overview

Seller home screen includes:
- Total Users Referred
- Total Purchase Amount through Seller ID
- Current Month Target & Achieved %
- Wallet Balance
- Latest Announcements from Admin

### Step 3: User Referral System

1. Seller visits farmers in nearby villages
2. Seller explains the app and provides his unique Seller ID
3. When user uses that ID:
   - Every purchase made by that user is linked to seller's account
   - Seller earns cashback or commission based on Admin's set rate

### Step 4: Wallet & Cashback Flow

1. For each completed order linked to Seller ID:
   - System calculates cashback (e.g., 2% of total order value)
   - Cashback added to seller's wallet automatically
2. Seller can view:
   - Wallet balance
   - Transaction details
   - Withdrawal requests (approved by Admin)

### Step 5: Target Management

1. Admin sets monthly sales target per seller (e.g., ₹1,00,000 total sales)
2. Seller dashboard shows:
   - Progress Bar (e.g., 75% achieved)
   - Number of orders through Seller ID
   - Incentives if target achieved

### Step 6: Notifications

- When cashback added → "You earned ₹200 for User Order #123."
- When target achieved → "Congratulations! You reached your monthly goal."
- When Admin updates policy or product info → instant push notification

---

## Admin Panel Flow (Super Admin)

### Step 1: Authentication

1. Admin logs in with secure credentials
2. Dashboard overview shows:
   - Total Users, Vendors, Sellers
   - Total Orders
   - Total Sales & Revenue
   - Pending Payments & Credits

### Step 2: Master Product Management

1. Add, edit, or delete fertilizer products
2. Assign products to vendors region-wise
3. Maintain:
   - Stock quantity
   - Price to vendor
   - Price to user
   - Expiry dates / batch info
4. Toggle product visibility (active/inactive)

### Step 3: Vendor Management

1. View all registered vendors with location map
2. Approve/reject new vendor applications
3. Set credit policy:
   - Credit Limit
   - Repayment days
   - Penalty rate
4. Approve vendor purchase requests (≥₹50,000)
5. Monitor vendor performance and dues

### Step 4: Seller Management

1. Create / edit seller profiles
2. Assign unique Seller IDs
3. Define cashback % or commission rates
4. Set monthly sales targets
5. Track each seller's progress, total referred users, and sales data
6. Approve seller wallet withdrawals

### Step 5: User Management

1. View list of all registered users
2. View linked seller IDs
3. Check each user's orders, payments, and support tickets
4. Block / deactivate suspicious accounts

### Step 6: Order & Payment Management

1. View all orders (User + Vendor)
2. Filter by region, vendor, date, status
3. Reassign orders when vendor unavailable
4. Monitor:
   - Advance (30%) payments
   - Pending (70%) payments
5. Generate invoices and sales reports

### Step 7: Credit & Finance Management

1. Manage vendor credits and repayment history
2. Apply penalties for delays automatically
3. Set global parameters:
   - Advance % (default 30%)
   - Minimum order for user (₹2,000)
   - Minimum vendor purchase (₹50,000)
4. View total outstanding credits and recovery status

### Step 8: Reporting & Analytics

Daily, weekly, and monthly summaries:
- Total orders
- Total revenue
- Region-wise performance
- Top Vendors and Sellers
- Export in Excel / PDF

---

## Key System Parameters

### Financial Thresholds

- **Minimum User Order Value**: ₹2,000
- **Minimum Vendor Purchase**: ₹50,000
- **Advance Payment**: 30% of order value
- **Remaining Payment**: 70% post-delivery

### Geographic Rules

- **Vendor Coverage**: 1 vendor per 20 km radius
- **Location Verification**: Google Maps API

### Delivery Timelines

- Configurable by Admin: 3 hours / 4 hours / 1 day

### Credit Management

- Credit limits set per vendor by Admin
- Daily penalty calculation for delayed payments
- Automatic restrictions on overdue accounts

---

## Technology Integrations

### APIs & Services

- **Google Translator API** - Multi-language support
- **Google Maps API** - Location verification and vendor radius management
- **Firebase / SMS API** - OTP authentication
- **Payment Gateways** - Razorpay / Paytm / Stripe

### Key Features

- Real-time notifications (push notifications)
- Multi-language support
- Location-based vendor assignment
- Automated credit management
- Commission/cashback tracking
- Comprehensive reporting and analytics

---

## Workflow Summary

### Order Flow

```
User → Cart → Checkout → Payment (30%) → Vendor Assignment → 
Stock Check → [Full/Partial/No Availability] → 
  - Full: Vendor Fulfills → Delivery → Payment (70%) → Cashback
  - Partial: Vendor Fulfills (some items) + Admin Fulfills (other items) → 
    Combined/Separate Deliveries → Payment (70%) → Cashback
  - No: Admin Fulfills → Delivery → Payment (70%) → Cashback
```

### Vendor Credit Flow

```
Vendor Request → Admin Approval → Stock Allocation → 
Credit Balance Update → Repayment Tracking → Penalty Calculation
```

### Seller Commission Flow

```
User Purchase (with Seller ID) → Order Completion → 
Cashback Calculation → Wallet Credit → Withdrawal Request → Admin Approval
```

---

*Document Version: 1.0*  
*Last Updated: 2024*


MONGODB pass = IRASathi#123
User ID = yash007patidar_db_user
User Password = oTtWNuYdLNaGKMe6