# IRA Sathi: Push Notification System - End-to-End Implementation Guide

## 1. Overview
This document outlines the complete architecture and setup of the Push Notification system for IRA Sathi. The system is designed for **High Stability**, **Zero-Disruption** to existing code, and **Shared-Scalability** (supporting Web, User App, Vendor App, and Seller App using a single backend service).

---

## 2. Core Implementation Principles (The "Antigravity" Protocol)
*   **Additive Architecture**: We never modified existing business logic. Instead, we "hooked" push notifications into the Notification Models.
*   **Non-Blocking Logic**: Sending a notification is a background task. If Firebase fails, the order/transaction remains successful.
*   **Role-Agile Registration**: A single API endpoint (`/api/fcm/register`) intelligently handles tokens for Users, Vendors, and Sellers using the provided Auth token.
*   **Fail-Safe Deployment**: The system handles missing configuration files gracefully, ensuring the server doesn't crash on startup.

---

## 3. Backend Implementation (Logic Layer)

### A. Database Extension
Added `fcmTokenWeb` and `fcmTokenApp` to:
- `User` Schema
- `Vendor` Schema
- `Seller` Schema

### B. The Notification "Hook"
Modified `createNotification` in `UserNotification.js`, `VendorNotification.js`, and `SellerNotification.js`. 
**Logic:** `Database Record Created` → `Trigger Push Notification Service (Async)`.

### C. Services & API
- **`services/firebaseAdmin.js`**: Initializes the Firebase Admin SDK.
- **`services/pushNotificationService.js`**: High-level helpers to send to specific IDs or Roles.
- **Endpoint:** `POST /api/fcm/register`
  - **Platform:** `web` or `app`
  - **Auth:** Standard Bearer Tokens.

---

## 4. VPS Deployment (Contabo Setup)
To sync the backend on your production server, follow these exact steps:

1.  **SSH**: `ssh root@173.249.22.67`
2.  **Pull**: `cd Backend && git pull origin main`
3.  **Install**: `npm install` (Must install `firebase-admin` library).
4.  **Secrets**: 
    - `mkdir -p config`
    - Create `config/firebase-service-account.json`.
    - **Paste** the contents of your Service Account JSON.
5.  **Restart**: `pm2 restart IRA_Sathi`
6.  **Logs**: `pm2 logs IRA_Sathi` (Verify `✅ Firebase Admin SDK initialized successfully`).

---

## 5. Firebase Configuration (Cloud Layer)
For this project, we utilize **one Firebase Project** to rule multiple "Apps."

### Registration Hierarchy:
1.  **Web App**: Shared config for the Browser platform.
2.  **Android App (User)**: Package name `com.irasathi.user`. Produces JSON #1.
3.  **Android App (Vendor)**: Package name `com.irasathi.vendor`. Produces JSON #2.
4.  **Android App (Seller)**: Package name `com.irasathi.seller`. Produces JSON #3.

---

## 6. Handover Guide for Flutter Developer
Provide the following to the mobile developer to ensure zero confusion:

### A. The Registration Workflow
Tell her: "The backend is role-agnostic. Send any token from any app to the same endpoint."
- **API URL:** `{{BASE_URL}}/api/fcm/register`
- **Payload:** `{ "token": "FCM_TOKEN", "platform": "app" }`
- **Header:** `Authorization: Bearer <The_Existing_User_Token>`

### B. Configuration Files
Provide these in separate secure folders:
- **For User App Dev**: Give `google-services.json` (from App #1).
- **For Vendor App Dev**: Give `google-services.json` (from App #2).
- **For Seller App Dev**: Give `google-services.json` (from App #3).

### C. Handling Data Payloads
The backend sends a `data` object for deep-linking. She must handle these types:
- `order_assigned` (Open Order Details)
- `commission_earned` (Open Wallet/Earnings)
- `repayment_due` (Open Credit Section)

---

## 7. Troubleshooting & Verification
- **Web Check**: Open the browser console. If permission is granted, you should see `✅ FCM token registered successfully`.
- **Server Check**: If a push fails, check the server logs. It will show `❌ Failed to send to token` but the frontend in-app notification will still work.
- **Token Freshness**: The system updates the token in the DB every time the user logs in, ensuring the "old" phones don't get notifications.

---

## 8. Summary of Principles for Future Developers
- **Never Change Controllers**: Do not add "send notification" code inside the checkout or payment controllers. It is already handled by the model layer.
- **Non-Critical Path**: Always treat Push Notifications as "best effort." Never block a database transaction waiting for a Firebase response.
- **Unified Branding**: Titles and icons are standardized in `pushNotificationService.js` to avoid fragmented UI across different apps.
