# Vendor Repayment System API Documentation

**Base URL:** `http://localhost:3000/api`  
**Version:** 2.0 (New Tier System)  
**Last Updated:** January 7, 2026

---

## 📋 Table of Contents

1. [Admin Endpoints - Tier Management](#admin-endpoints)
2. [Vendor Endpoints - Repayment Operations](#vendor-endpoints)
3. [Authentication](#authentication)
4. [Example Requests](#example-requests)
5. [Error Responses](#error-responses)

---

## 🔐 Authentication

All endpoints require authentication:

### Admin Endpoints
- Header: `Authorization: Bearer <admin_token>`
- Requires `authorizeAdmin` middleware

### Vendor Endpoints
- Header: `Authorization: Bearer <vendor_token>`
- Requires `authorizeVendor` middleware

---

## 👨‍💼 Admin Endpoints - Tier Management

### Base Path: `/admin/repayment-config`

---

### 1. Get All Discount Tiers

**GET** `/admin/repayment-config/discounts`

**Query Parameters:**
- `isActive` (optional): `true` or `false`

**Response:**
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "_id": "...",
      "tierName": "0-30 Days Super Early Bird Discount",
      "periodStart": 0,
      "periodEnd": 30,
      "discountRate": 10,
      "description": "Maximum savings! Pay within 30 days and save 10%",
      "isActive": true,
      "createdAt": "2026-01-07T...",
      "updatedAt": "2026-01-07T..."
    }
  ],
  "systemStatus": {
    "count": 4,
    "valid": true,
    "errors": []
  },
  "meta": {
    "isHealthy": true,
    "warnings": [],
    "errors": []
  }
}
```

---

### 2. Create Discount Tier

**POST** `/admin/repayment-config/discounts`

**Request Body:**
```json
{
  "tierName": "70-80 Days Late Discount",
  "periodStart": 70,
  "periodEnd": 80,
  "discountRate": 1,
  "description": "Small discount for slightly late payment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discount tier created successfully",
  "data": {...},
  "warnings": []
}
```

**Validation Errors:**
```json
{
  "success": false,
  "message": "Tier validation failed",
  "errors": [
    "Period overlaps with existing tier(s): 60-90 Days Standard Discount (60-90 days)"
  ],
  "warnings": []
}
```

---

### 3. Update Discount Tier

**PUT** `/admin/repayment-config/discounts/:id`

**Request Body:**
```json
{
  "discountRate": 12,
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Discount tier updated successfully",
  "data": {...}
}
```

---

### 4. Delete Discount Tier

**DELETE** `/admin/repayment-config/discounts/:id`

**Response:**
```json
{
  "success": true,
  "message": "Discount tier deleted successfully"
}
```

---

### 5. Get All Interest Tiers

**GET** `/admin/repayment-config/interests`

**Query Parameters:**
- `isActive` (optional): `true` or `false`

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "...",
      "tierName": "105-120 Days Late Payment Interest",
      "periodStart": 105,
      "periodEnd": 120,
      "interestRate": 5,
      "isOpenEnded": false,
      "description": "Late payment charges apply",
      "isActive": true
    },
    {
      "_id": "...",
      "tierName": "120+ Days Severe Delay Interest",
      "periodStart": 120,
      "periodEnd": 999999,
      "interestRate": 10,
      "isOpenEnded": true,
      "description": "Severe delay! 10% interest"
    }
  ]
}
```

---

### 6. Create Interest Tier

**POST** `/admin/repayment-config/interests`

**Request Body (Fixed Period):**
```json
{
  "tierName": "90-105 Days Moderate Interest",
  "periodStart": 90,
  "periodEnd": 105,
  "interestRate": 2,
  "description": "Moderate interest for payment between 90-105 days",
  "isOpenEnded": false
}
```

**Request Body (Open-Ended):**
```json
{
  "tierName": "150+ Days Extreme Delay",
  "periodStart": 150,
  "interestRate": 15,
  "description": "Extreme delay penalty",
  "isOpenEnded": true
}
```

---

### 7. Get System Status

**GET** `/admin/repayment-config/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "isHealthy": true,
    "discountTiers": {
      "count": 4,
      "tiers": [
        {
          "id": "...",
          "name": "0-30 Days Super Early Bird Discount",
          "period": "0-30 days",
          "rate": "10%"
        }
      ],
      "valid": true,
      "errors": []
    },
    "interestTiers": {
      "count": 2,
      "tiers": [...],
      "valid": true,
      "errors": []
    },
    "separation": {
      "valid": true,
      "errors": [],
      "warnings": [
        "Neutral zone exists: Days 91 to 104 (14 days) have 0% discount and 0% interest."
      ]
    },
    "errors": [],
    "warnings": []
  }
}
```

---

### 8. Validate Configuration

**POST** `/admin/repayment-config/validate`

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "separation": {...},
    "systemStatus": {...}
  }
}
```

---

## 🏪 Vendor Endpoints - Repayment Operations

### Base Path: `/vendors/credit`

---

### 1. Calculate Repayment Amount

**POST** `/vendors/credit/repayment/calculate`

**Request Body:**
```json
{
  "purchaseId": "67890...",
  "repaymentDate": "2026-01-20"  // Optional, defaults to today
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "purchaseId": "67890...",
    "purchaseDate": "2026-01-01T...",
    "repaymentDate": "2026-01-20T...",
    "daysElapsed": 19,
    "baseAmount": 75000,
    "discountTier": "0-30 Days Super Early Bird Discount",
    "discountRate": 10,
    "discountAmount": 7500,
    "interestTier": null,
    "interestRate": 0,
    "interestAmount": 0,
    "finalPayable": 67500,
    "savingsFromEarlyPayment": 7500,
    "penaltyFromLatePayment": 0,
    "tierApplied": "0-30 Days Super Early Bird Discount",
    "tierId": "...",
    "tierType": "discount",
    "financialBreakdown": {
      "baseAmount": 75000,
      "discountDeduction": 7500,
      "interestAddition": 0,
      "finalPayable": 67500,
      "savingsFromEarlyPayment": 7500,
      "penaltyFromLatePayment": 0
    },
    "summary": {
      "youPay": "₹67,500.00",
      "youSave": "₹7,500.00",
      "penalty": "₹0",
      "message": "🎉 You're saving ₹7500.00 by paying early! (10% discount)"
    }
  },
  "purchase": {
    "id": "67890...",
    "purchaseAmount": 75000,
    "purchaseDate": "2026-01-01T...",
    "status": "approved"
  }
}
```

---

### 2. Get Repayment Projection

**GET** `/vendors/credit/repayment/:purchaseId/projection`

**Response:**
```json
{
  "success": true,
  "data": {
    "purchaseId": "67890...",
    "purchaseAmount": 75000,
    "purchaseDate": "2026-01-01T...",
   "projections": [
      {
        "label": "Today",
        "day": 19,
        "date": "2026-01-20",
        "daysFromNow": 0,
        "isPast": false,
        "isFuture": false,
        "isToday": true,
        "baseAmount": 75000,
        "discountDeduction": 7500,
        "interestAddition": 0,
        "finalPayable": 67500,
        "savingsFromEarlyPayment": 7500,
        "penaltyFromLatePayment": 0,
        "tierApplied": "0-30 Days Super Early Bird Discount",
        "tierType": "discount",
        "discountRate": 10,
        "interestRate": 0,
        "paymentAdvice": "✅ Great! 10% discount available now"
      },
      {
        "label": "Day 30",
        "day": 30,
        "date": "2026-01-31",
        "daysFromNow": 11,
        "finalPayable": 67500,
        "tierApplied": "0-30 Days Super Early Bird Discount",
        "tierType": "discount",
        "discountRate": 10,
        "paymentAdvice": "💰 10% discount if you pay in 11 days"
      },
      {
        "label": "Day 35",
        "day": 35,
        "finalPayable": 70500,
        "tierType": "discount",
        "discountRate": 6
      },
      {
        "label": "Day 105",
        "day": 105,
        "finalPayable": 78750,
        "tierType": "interest",
        "interestRate": 5,
        "paymentAdvice": "⚠️ 5% interest will apply in X days"
      },
      {
        "label": "Day 120",
        "day": 120,
        "finalPayable": 82500,
        "tierType": "interest",
        "interestRate": 10
      }
    ],
    "bestOption": {
      "day": 19,
      "date": "2026-01-20",
      "amount": 67500,
      "savings": 7500,
      "tierApplied": "0-30 Days Super Early Bird Discount"
    },
    "recommendation": {
      "type": "discount",
      "message": "💰 Pay within 30 days to save ₹7500.00",
      "urgency": "high"
    }
  }
}
```

---

### 3. Submit Repayment

**POST** `/vendors/credit/repayment/:purchaseId/submit`

**Request Body:**
```json
{
  "repaymentAmount": 67500,  // Optional, will be auto-calculated
  "paymentMode": "online",
  "transactionId": "TXN123456",
  "notes": "Paying early to save discount"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Repayment submitted successfully",
  "data": {
    "repayment": {
      "_id": "...",
      "repaymentId": "REP-20260120-0001",
      "vendorId": "...",
      "purchaseOrderId": "...",
      "purchaseDate": "2026-01-01T...",
      "repaymentDate": "2026-01-20T...",
      "daysElapsed": 19,
      "amount": 75000,
      "originalAmount": 75000,
      "adjustedAmount": 67500,
      "totalAmount": 67500,
      "discountApplied": {
        "tierName": "0-30 Days Super Early Bird Discount",
        "tierId": "...",
        "discountRate": 10,
        "discountAmount": 7500
      },
      "financialBreakdown": {
        "baseAmount": 75000,
        "discountDeduction": 7500,
        "interestAddition": 0,
        "finalPayable": 67500,
        "savingsFromEarlyPayment": 7500,
        "penaltyFromLatePayment": 0
      },
      "calculationMethod": "tiered_discount_interest",
      "status": "completed",
      "createdAt": "2026-01-20T..."
    },
    "calculation": {...},
    "vendor": {
      "creditLimit": 200000,
      "creditUsed": 0,
      "creditAvailable": 200000,
      "creditScore": 100,
      "performanceTier": "platinum"
    }
  }
}
```

**Error - Amount Mismatch:**
```json
{
  "success": false,
  "message": "Repayment amount does not match calculated amount",
  "expected": 67500,
  "provided": 70000,
  "difference": 2500
}
```

---

### 4. Get Repayment History

**GET** `/vendors/credit/repayments?page=1&limit=10&status=completed`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 5,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "...",
      "repaymentId": "REP-20260120-0001",
      "amount": 75000,
      "totalAmount": 67500,
      "daysElapsed": 19,
      "discountApplied": {...},
      "financialBreakdown": {...},
      "status": "completed",
      "createdAt": "2026-01-20T..."
    }
  ]
}
```

---

### 5. Get Single Repayment Details

**GET** `/vendors/credit/repayments/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "repaymentId": "REP-20260120-0001",
    "vendorId": {...},
    "purchaseOrderId": {...},
    "amount": 75000,
    "totalAmount": 67500,
    "discountApplied": {...},
    "interestApplied": {...},
    "financialBreakdown": {...},
    "calculationMethod": "tiered_discount_interest",
    "status": "completed"
  }
}
```

---

### 6. Get Credit Summary

**GET** `/vendors/credit/summary`

**Response:**
```json
{
  "success": true,
  "data": {
    "creditLimit": 200000,
    "creditUsed": 50000,
    "creditAvailable": 150000,
    "creditHistory": {
      "totalCreditTaken": 150000,
      "totalRepaid": 100000,
      "totalDiscountsEarned": 12000,
      "totalInterestPaid": 500,
      "avgRepaymentDays": 25,
      "onTimeRepaymentCount": 3,
      "lateRepaymentCount": 1,
      "totalRepaymentCount": 4,
      "creditScore": 95,
      "lastRepaymentDate": "2026-01-20T...",
      "lastRepaymentDays": 19
    },
    "performanceTier": "platinum",
    "outstandingPurchases": {
      "count": 1,
      "totalAmount": 50000,
      "purchases": [
        {
          "id": "...",
          "amount": 50000,
          "date": "2026-01-15T...",
          "status": "approved"
        }
      ]
    },
    "totalRepayments": 4
  }
}
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields: tierName, periodStart, periodEnd, discountRate"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized - not your purchase"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Discount tier not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server error",
  "error": "..."
}
```

---

## 📊 Credit Score System

**Score Range:** 0-100

**Calculation Factors:**
1. On-time repayment rate (40 points)
2. Average repayment days (30 points)
3. Interest-to-discount ratio (20 points)
4. Recent performance trend (10 points)

**Performance Tiers:**
- **Platinum:** 90-100 score
- **Gold:** 75-89 score
- **Silver:** 60-74 score
- **Bronze:** < 60 score

---

## 🧪 Testing the APIs

### Using Postman/Thunder Client:

1. **Login as Admin** → Get token
2. **Test Tier Management:**
   - GET `/api/admin/repayment-config/discounts`
   - GET `/api/admin/repayment-config/status`

3. **Login as Vendor** → Get token
4. **Test Repayment Flow:**
   - GET `/api/vendors/credit/summary`
   - POST `/api/vendors/credit/repayment/calculate` (with purchaseId)
   - GET `/api/vendors/credit/repayment/:purchaseId/projection`

---

**API Version:** 2.0  
**System:** Satpura Bio Vendor Credit Module  
**Last Updated:** January 7, 2026, 3:00 PM IST
