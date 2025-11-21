# Frontend-Backend Integration SOP

## Standard Operating Procedure for Dashboard Integration

This document outlines the systematic approach to integrate frontend dashboards with backend APIs, ensuring no gaps or missing data that could lead to errors.

---

## SOP Point 1: Pre-Integration Backend & Data Verification

**Action**: Before starting frontend integration, verify backend completeness and ensure required data exists.

1. **Backend Endpoint Audit**
   - Review frontend API service files (e.g., `adminApi.js`) to list all API calls
   - For each frontend API function, verify:
     - Corresponding backend route exists in routes file
     - Backend controller function is implemented
     - Request/response formats match (params, body, query strings)
     - Authentication/authorization middleware is applied
   - **Fix**: Add any missing backend endpoints/controllers immediately

2. **Data Requirements Analysis**
   - Analyze backend controllers to identify required data for endpoints
   - Determine: collections queried, relationships needed (populate calls), data states required (pending/approved/active), aggregation query needs
   - **Verify**: All referenced IDs and relationships exist in MongoDB

3. **Create & Run Seed Scripts**
   - Create/update seed scripts (e.g., `ensureAdminData.js`) to ensure required data exists
   - Seed script should create:
     - At least 10+ records per collection (where applicable)
     - Multiple status/state variations (approved, pending, active, blocked, etc.)
     - Proper relationships between collections (ObjectId references, sellerId strings, etc.)
     - Edge case data (escalated orders, pending approvals, etc.)
   - Run: `npm run ensure-{dashboard}-data`

4. **Create & Run Verification Script**
   - Create verification script (e.g., `verifyAdminData.js`) to check data integrity
   - Checks: minimum data requirements, no broken references, dashboard queries work, all populate() calls work
   - Run: `npm run verify-{dashboard}-data`
   - **Fix**: Resolve any errors or missing data until verification passes 100%

**Success Criteria**: All backend endpoints exist, database contains all required data, verification script passes completely.

---

## SOP Point 2: Frontend API Integration

**Action**: Replace mock implementations with real backend API calls, ensuring data transformation.

1. **Replace Mock API Calls**
   - Replace all `return mockData` with actual `apiRequest()` calls in frontend service files
   - Use existing pattern from `adminApi.js`:
     ```javascript
     export async function getData() {
       const response = await apiRequest('/endpoint', { method: 'GET' })
       if (response.success && response.data) {
         return { success: true, data: transformData(response.data) }
       }
       return response
     }
     ```

2. **Data Transformation Functions**
   - Create transform functions to map backend response structure to frontend expected format
   - Ensure error handling matches frontend expectations
   - Verify authentication tokens are passed correctly (from localStorage)

3. **Update Custom Hooks**
   - Update dashboard-specific hooks (e.g., `useAdminApi.js`) to use integrated API functions
   - Ensure all hook callbacks call the updated API service functions
   - Verify loading states, error handling, and context updates work correctly

**Success Criteria**: All mock implementations replaced, data transformation works, hooks updated.

---

## SOP Point 3: Cross-Check & Endpoint Alignment

**Action**: Perform final verification that frontend and backend are fully aligned.

1. **Endpoint Coverage Verification**
   - List all frontend API functions in the service file
   - For each function, verify:
     - Backend route exists in routes file
     - Backend controller function is implemented
     - Request/response format alignment
   - **Document**: Confirm 100% coverage - no missing endpoints

2. **Fix Missing Endpoints Immediately**
   - If frontend needs something missing in backend, add it immediately (both should go hand in hand)
   - Add backend endpoint → Add frontend API call → Test together
   - Do not proceed with integration if endpoints are missing

**Success Criteria**: 100% endpoint coverage, frontend and backend fully aligned.

---

## SOP Point 4: End-to-End Testing & Data Flow Verification

**Action**: Verify complete data flow from database → backend → frontend works correctly.

1. **Data Flow Test**
   - Test dashboard overview loads with correct stats
   - Test list views show data (pagination works)
   - Test detail views populate correctly
   - Test filter/search queries return expected results
   - Test CRUD operations work end-to-end

2. **Relationship Integrity Check**
   - Verify all populated relationships resolve correctly (no broken ObjectId references)
   - Verify no null/undefined values break the frontend
   - Test edge cases (deleted references, soft-deleted records)
   - **Fix**: Update seed scripts to maintain referential integrity if issues found

3. **Error Handling Verification**
   - Test 404 errors are handled gracefully
   - Test empty data states display correctly
   - Test authentication errors redirect properly
   - Verify no console errors or warnings

**Success Criteria**: All screens load without 404 errors or empty data, relationships resolve correctly, error handling works.

---

## Quick Reference Checklist

**Before Integration:**
- [ ] Backend endpoints exist for all frontend API calls
- [ ] Seed script created and run successfully (`npm run ensure-{dashboard}-data`)
- [ ] Verification script passes completely (`npm run verify-{dashboard}-data`)
- [ ] No broken references in database
- [ ] All required data exists (various statuses, relationships, edge cases)

**During Integration:**
- [ ] Replace all mock implementations with real API calls
- [ ] Create data transformation functions
- [ ] Update custom hooks
- [ ] Add missing endpoints immediately if frontend requires them

**After Integration:**
- [ ] 100% endpoint coverage verified
- [ ] All screens load without 404 errors
- [ ] Data displays correctly in all views
- [ ] CRUD operations tested end-to-end
- [ ] Relationships resolve correctly
- [ ] Error handling works properly

---

## NPM Scripts Pattern

Add these scripts to `package.json` for each dashboard:

```json
{
  "ensure-{dashboard}-data": "node scripts/ensure{dashboard}Data.js",
  "verify-{dashboard}-data": "node scripts/verify{dashboard}Data.js"
}
```

**Examples:**
- `npm run ensure-admin-data` / `npm run verify-admin-data`
- `npm run ensure-seller-data` / `npm run verify-seller-data`
- `npm run ensure-vendor-data` / `npm run verify-vendor-data`
- `npm run ensure-user-data` / `npm run verify-user-data`

---

## Key Principles

1. **Order Matters**: Always complete SOP Point 1 (Backend & Data Verification) before Point 2 (Frontend Integration)
2. **No Shortcuts**: Don't skip verification scripts - they catch issues early
3. **Frontend-Backend Hand in Hand**: If frontend needs something missing in backend, add it immediately. Both should go hand in hand.
4. **Data First**: Ensure data exists before testing endpoints - use seed and verification scripts
5. **Referential Integrity**: Always fix broken references - they cause runtime errors

---

## Success Criteria

✅ **Integration Complete When:**
1. All frontend API functions have corresponding backend endpoints
2. Database contains all required data (verified by verification script)
3. No broken references or missing relationships
4. All frontend screens load without 404 errors
5. Data displays correctly in all views (lists, details, stats)
6. CRUD operations work end-to-end

---

## ⚠️ IMPORTANT NOTE: MongoDB Collection & Data Requirements

**Critical Step**: After completing the Frontend-Backend integration for a Dashboard, perform a comprehensive scan of the entire integration to ensure all MongoDB collections and data requirements are met.

### What to Do:

1. **Complete Integration Scan**
   - Scan ALL Frontend API service files for the Dashboard (e.g., `sellerApi.js`, `vendorApi.js`)
   - Scan ALL Backend controllers for the Dashboard (e.g., `sellerController.js`, `vendorController.js`)
   - Scan ALL Backend routes for the Dashboard (e.g., `routes/seller.js`, `routes/vendor.js`)
   - Identify every API endpoint used by the Dashboard

2. **Identify MongoDB Collections Needed**
   - For each endpoint, identify:
     - Which collections are queried (using `Model.find()`, `Model.countDocuments()`, `Model.aggregate()`)
     - Which collections are populated (using `.populate()`)
     - Which collections are referenced (ObjectId references, foreign keys)
   - List all collections that need to exist in MongoDB
   - **Create missing collections** if they don't exist

3. **Identify Data Requirements**
   - For each collection, determine what data needs to exist:
     - Minimum record counts (e.g., at least 10 users, 5 vendors)
     - Status variations (e.g., pending, approved, active, blocked)
     - Relationship requirements (e.g., users linked to sellers, orders linked to vendors)
     - Edge case data (e.g., escalated orders, pending approvals)
   - **Feed data into existing collections** if required data is missing

4. **Update Seed & Verification Scripts**
   - Update/create `ensure{dashboard}Data.js` script to create all identified collections and data
   - Update/create `verify{dashboard}Data.js` script to verify all identified requirements
   - Ensure scripts cover ALL endpoints used by the Dashboard

### Example Process:

```
1. Integration Complete → Scan all files
2. Identify: "This endpoint needs Orders with status='delivered'"
3. Check MongoDB: "Do we have delivered orders? No."
4. Update seed script: Add delivered orders
5. Run seed script: npm run ensure-{dashboard}-data
6. Verify: npm run verify-{dashboard}-data
7. Confirm: All endpoints have required data
```

### Why This Matters:

- **Prevents 404 Errors**: Missing data causes endpoints to return empty results or errors
- **Prevents Broken References**: Missing collections cause populate() calls to fail
- **Ensures Dashboard Functionality**: All dashboard screens need data to display correctly
- **Catches Edge Cases**: Some endpoints need specific data states that might be overlooked

### Checklist:

After Dashboard integration, verify:
- [ ] All collections referenced in backend controllers exist in MongoDB
- [ ] All data states required by endpoints exist (pending, approved, active, etc.)
- [ ] All relationships between collections are properly set up
- [ ] Seed script covers all identified data requirements
- [ ] Verification script checks all identified requirements
- [ ] All dashboard screens can load without 404 errors or empty data

**Remember**: This scanning process should be done **AFTER** the Frontend-Backend connection is complete for a Dashboard, but **BEFORE** considering the Dashboard integration finished.

---

**Last Updated**: After Admin Dashboard Integration  
**Next Dashboard**: Seller Dashboard Integration

