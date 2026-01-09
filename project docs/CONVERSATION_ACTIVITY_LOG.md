# Multi-Module Architecture & Development Log: FarmCommerce

This document serves as a comprehensive technical record of all implementations, architectural decisions, and strategic planning completed during this session. It covers the logic behind the changes, the specific files modified, and a guide on avoiding common implementation "dead-ends."

---

## 1. Segmented User Management (Admin Panel)

### **Task**
Modify the Admin `Users` page to support distinct organizational views: All, Active, Inactive, and Incomplete (In-Progress Registrations).

### **Files Involved**
- `Frontend/src/modules/Admin/pages/Users.jsx` (UI & Filtering Logic)
- `Frontend/src/modules/Admin/components/Sidebar.jsx` (Navigation Links)

### **Technical Approach**
- **Contextual Filtering**: Instead of multiple API calls, we utilized a master state (`allUsersList`) and applied a `useEffect` hook that triggers whenever the `subRoute` (passed via the router) changes.
- **Activity Heuristics**: Defined "Active" users as those with a `lastOrderDate` within a 60-day rolling window. "Incomplete" users are identified by the placeholder name `'Pending Registration'`.
- **UI Transition**: Transitioned from modal-heavy interactions to a "Full-Screen View" state management within the page, keeping the user in context during deep dives.

### **How Not to Get Stuck**
- **Avoid Over-fetching**: Do not create separate API endpoints for "Active" vs "Inactive" unless the dataset is in the millions. Client-side filtering is faster and safer for standard operational dashboards.
- **Relative Time Calculation**: Always calculate "60 days ago" relative to `new Date()` at the time of the filter, rather than hardcoding dates or relying on backend flags that might get stale.

---

## 2. Universal Support Ticket System (User, Seller, Admin)

### **Task**
Implement a complete end-to-end ticketing system allowing Users and Sellers to report issues, and Admins to manage and resolve them.

### **Files Involved**
- **User Side**: `Frontend/src/modules/User/pages/views/AccountView.jsx`
- **Seller Side**: `Frontend/src/modules/Seller/pages/views/ProfileView.jsx`
- **Admin Side**: `Frontend/src/modules/Admin/pages/Support.jsx` (New Management Interface)
- **Routing**: `Frontend/src/modules/Admin/routes/AdminDashboardRoute.jsx`
- **Navigation**: `Frontend/src/modules/Admin/components/Sidebar.jsx`

### **Technical Approach**
- **Unified Schema**: Standardized the ticket object structure (Ticket ID, Subject, Category, Status, Priority, Messages Array) across all three modules to ensure data interoperability.
- **Threaded Communication**: Implemented a "Chat-Style" rendering logic where `msg.isFromAdmin` determines bubble alignment and color styling.
- **Dual-Pane Admin Management**:
    - **Left Pane**: List view with unread indicators and status-based badges.
    - **Right Pane**: Contextual conversation area with state-aware input (disabled if ticket is closed).
- **Stateless Input**: Used local state for `newMessage` and `reply` text, ensuring that typing doesn't trigger parent re-renders until submission.

### **How Not to Get Stuck**
- **Message IDs**: When implementing the thread, never use the array index as a key. Use unique message IDs from the backend to prevent list reconciliation errors during real-time updates.
- **Closed State Safety**: Always ensure the messaging input is conditionally unmounted or disabled when the ticket status is `closed` to prevent orphan replies in the database.

---

## 3. Global API & Hook Synchronization

### **Task**
Standardize support APIs and resolve "Rules of Hooks" violations in the Seller module.

### **Files Involved**
- `Frontend/src/modules/Seller/hooks/useSellerApi.js` (Expansion & Validation)
- `Frontend/src/modules/User/services/userApi.js` (Unified Support Methods)
- `Frontend/src/modules/Seller/services/sellerApi.js` (Unified Support Methods)
- `Frontend/src/modules/Admin/services/adminApi.js` (Management Support Methods)

### **Technical Approach**
- **Hook Destructuring**: Refactored `ProfileView.jsx` to destructure all necessary methods from `useSellerApi()` at the top level. Previously, illegal attempts to call the hook inside inside async handlers caused runtime errors.
- **Promise-Based Handling**: Updated the `useSellerApi` hook to properly return data/error objects, allowing components to handle `success` or `warning` toasts based on the API response.

### **How Not to Get Stuck**
- **The Hook Rule**: NEVER call a React Hook (`useSomething`) inside a function, a loop, or a condition. Always call it at the very top of your component function.
- **Result Consistency**: Ensure every API service returns a consistent object shape `{ success: boolean, data: any, error: any }`. Mixing return types causes "undefined" property errors in the UI.

---

## 4. Frontend Build & Dependency Stabilization

### **Task**
Resolve Rollup/Vite bundling errors and missing asset dependencies.

### **Files Involved**
- `Frontend/src/modules/User/services/userApi.js` (Fixed Duplicate Exports)
- `Frontend/src/modules/Admin/components/Sidebar.jsx` (Fixed Syntax and Typo Errors)
- `Frontend/src/modules/Seller/components/icons.jsx` (Added missing `ChevronRightIcon`)

### **Technical Approach**
- **Bundle Audit**: Ran `npm run build` to expose Rollup errors. Identified duplicate declarations of `createSupportTicket` and `getSupportTickets` that were preventing minification.
- **Asset Polyfills**: Identified that the Seller module's `ProfileView` was relying on an icon (`ChevronRightIcon`) that didn't exist in its local `icons.jsx` file. Manually implemented the SVG path to satisfy the dependency tree.

### **How Not to Get Stuck**
- **Git Hygiene**: Before pushing, run `git status` and specifically look for "Untracked files" like build logs (`build_output.txt`). These bloat the repo and should be ignored.
- **Silent Errors**: Just because `npm run dev` works doesn't mean the build will. Dev servers are lenient; production builds are not. Build early and build often.

---

## 5. Strategic Workflow Mapping (Administrative & Operational Gaps)

### **Gap: Global Settings Propagation Hub**
- **Approach**: Implementation of an `AdminSettings` dashboard. 
- **Avoiding Pitfalls**: Don't hardcode "Min Order Value" in the frontend. If the Admin changes it to ₹2,500, every User's Checkout button logic must update instantly via a global config fetch.

### **Gap: Multi-Vendor Escalation Management**
- **Approach**: Added a "Pending/Escalated" status to Orders. 
- **Avoiding Pitfalls**: Do not automate re-assignment indefinitely. If three vendors reject, it MUST land on an Admin's "High Priority Action" list for human intervention.

### **Gap: Delivery "Handshake" Verification**
- **Approach**: Two-factor verification using a User-provided OTP that the Vendor enters.
- **Avoiding Pitfalls**: Don't unlock the full payment to the Vendor's wallet based on GPS alone. GPS can be spoofed; a physical OTP handshake cannot.

### **Gap: Tiered Commission Visualization**
- **Approach**: Progress bar in the Seller UI for the ₹50,000 threshold.
- **Avoiding Pitfalls**: Ensure the "Incentive" logic is calculated on current month's "Completed & Paid" orders only, not processing ones, to prevent over-calculating potential earnings.

---
**Status**: Session Complete. Code Sanity Verified. All architectural documentation is up to date. 🏁
