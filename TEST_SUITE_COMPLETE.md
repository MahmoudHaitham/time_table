# Complete Test Suite for Timetable Management System
**Version:** 1.0  
**Date:** January 23, 2026  
**Purpose:** Pre-production verification and validation  
**Scope:** End-to-end testing of all system components

---

## Table of Contents

1. [Authentication Test Cases](#1-authentication-test-cases)
2. [Authorization & Role-Based Access](#2-authorization--role-based-access)
3. [Admin Panel Test Cases](#3-admin-panel-test-cases)
4. [Timetable Generation Logic](#4-timetable-generation-logic)
5. [Schedule Viewing & Data Access](#5-schedule-viewing--data-access)
6. [PDF Export Test Cases](#6-pdf-export-test-cases)
7. [Frontend Security Test Cases](#7-frontend-security-test-cases)
8. [API Security Test Cases](#8-api-security-test-cases)
9. [CSRF Protection](#9-csrf-protection)
10. [Error Handling & Logging](#10-error-handling--logging)
11. [Performance & Stability](#11-performance--stability)
12. [Regression Tests](#12-regression-tests)
13. [Environment & Configuration](#13-environment--configuration)

---

## 1. Authentication Test Cases

### TC-AUTH-001: Valid Credentials Login
**Area:** Auth  
**Preconditions:** 
- Backend server running
- User exists in database with valid credentials
- Frontend accessible

**Steps:**
1. Navigate to `/login`
2. Enter valid registration number
3. Enter valid password
4. Click "Sign In"

**Expected Result:**
- Login succeeds
- Access token stored in `sessionStorage` as `auth_token`
- Refresh token stored in httpOnly cookie `refreshToken`
- CSRF token received in response header `X-CSRF-Token`
- User redirected to `/admin/timetable` (or redirect parameter)
- User data stored in `sessionStorage` as `user`

**Severity if Fails:** Critical

---

### TC-AUTH-002: Invalid Credentials - Wrong Password
**Area:** Auth  
**Preconditions:** 
- Backend server running
- User exists in database

**Steps:**
1. Navigate to `/login`
2. Enter valid registration number
3. Enter incorrect password
4. Click "Sign In"

**Expected Result:**
- Login fails with 401 status
- Error message: "Invalid credentials"
- No tokens stored
- User remains on login page
- Rate limit counter increments

**Severity if Fails:** High

---

### TC-AUTH-003: Invalid Credentials - Non-existent User
**Area:** Auth  
**Preconditions:** 
- Backend server running

**Steps:**
1. Navigate to `/login`
2. Enter non-existent registration number
3. Enter any password
4. Click "Sign In"

**Expected Result:**
- Login fails with 401 status
- Error message: "Invalid credentials" (generic, no user enumeration)
- No tokens stored
- User remains on login page
- Rate limit counter increments

**Severity if Fails:** High

---

### TC-AUTH-004: Brute Force Attempts - Rate Limit Hit
**Area:** Auth / Security  
**Preconditions:** 
- Backend server running
- Rate limiter configured (5 attempts per 15 minutes)

**Steps:**
1. Navigate to `/login`
2. Attempt login with wrong credentials 6 times rapidly
3. Observe response on 6th attempt

**Expected Result:**
- First 5 attempts return 401 "Invalid credentials"
- 6th attempt returns 429 "Rate limit exceeded"
- Response includes `retryAfter` seconds
- Response headers include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- After retry period expires, attempts allowed again

**Severity if Fails:** Critical

---

### TC-AUTH-005: Remote Code Execution Attempt via Login
**Area:** Security  
**Preconditions:** 
- Backend server running

**Steps:**
1. Navigate to `/login`
2. Enter registration number: `'; DROP TABLE users; --`
3. Enter password: `<script>alert('XSS')</script>`
4. Click "Sign In"

**Expected Result:**
- Input validation rejects malicious payloads
- No SQL injection occurs
- No XSS execution
- Error message: "Invalid credentials" or validation error
- Database remains intact
- No code execution

**Severity if Fails:** Critical

---

### TC-AUTH-006: Rate Limit Reset After Window
**Area:** Auth / Performance  
**Preconditions:** 
- Backend server running
- Rate limit window: 15 minutes

**Steps:**
1. Make 5 failed login attempts
2. Wait 16 minutes
3. Attempt login again

**Expected Result:**
- After 16 minutes, rate limit window resets
- New login attempt allowed
- Rate limit counter starts fresh

**Severity if Fails:** Medium

---

### TC-AUTH-007: Logout Invalidates Session
**Area:** Auth  
**Preconditions:** 
- User logged in successfully
- Valid access token in sessionStorage
- Valid refresh token in httpOnly cookie

**Steps:**
1. Call logout API endpoint: `POST /api/auth/logout`
2. Verify tokens cleared
3. Attempt to access protected route

**Expected Result:**
- Logout succeeds (200 OK)
- Refresh token cookie cleared (`refreshToken` cookie removed)
- Access token removed from `sessionStorage`
- CSRF token removed from `sessionStorage`
- User data removed from `sessionStorage`
- Subsequent API calls with old access token return 401
- Refresh token endpoint rejects old refresh token

**Severity if Fails:** High

---

### TC-AUTH-008: Token Expiry - Access Token (15 minutes)
**Area:** Auth  
**Preconditions:** 
- User logged in successfully
- Access token expires in 15 minutes

**Steps:**
1. Login successfully
2. Note access token expiry time
3. Wait 16 minutes without activity
4. Make API request with expired access token

**Expected Result:**
- After 15 minutes, access token expires
- API request with expired token returns 401 "Invalid or expired token"
- Frontend automatically attempts token refresh
- If refresh token valid, new access token issued
- Original request retried with new token

**Severity if Fails:** High

---

### TC-AUTH-009: Auto Refresh Token Success
**Area:** Auth  
**Preconditions:** 
- User logged in successfully
- Access token expired
- Refresh token still valid (7 days)

**Steps:**
1. Login successfully
2. Manually expire access token (or wait 15 minutes)
3. Make API request with expired access token
4. Observe automatic refresh behavior

**Expected Result:**
- API request with expired token triggers 401
- Frontend automatically calls `POST /api/auth/refresh`
- Refresh token from httpOnly cookie sent automatically
- New access token received and stored in `sessionStorage`
- Original API request retried with new token
- Request succeeds transparently to user

**Severity if Fails:** High

---

### TC-AUTH-010: Refresh Token Expiry
**Area:** Auth  
**Preconditions:** 
- User logged in successfully
- Refresh token expires in 7 days

**Steps:**
1. Login successfully
2. Wait 7 days and 1 minute (or manually expire refresh token)
3. Attempt to refresh access token

**Expected Result:**
- Refresh token endpoint called
- Returns 401 "Invalid or expired refresh token"
- User redirected to login page
- All tokens cleared from storage
- User must re-login

**Severity if Fails:** High

---

### TC-AUTH-011: Refresh Token Reuse Prevention
**Area:** Security  
**Preconditions:** 
- User logged in successfully
- CSRF protection active

**Steps:**
1. Login successfully
2. Call refresh endpoint: `POST /api/auth/refresh`
3. Receive new access token
4. Immediately call refresh endpoint again with same refresh token

**Expected Result:**
- First refresh succeeds
- Second refresh attempt fails
- CSRF token is single-use (if CSRF applies to refresh)
- Error: "Invalid or expired refresh token" or "CSRF token required"
- Refresh token rotation enforced (if implemented)

**Severity if Fails:** Medium

---

### TC-AUTH-012: Logout + Reuse Old Token
**Area:** Security  
**Preconditions:** 
- User logged in successfully
- Access token obtained

**Steps:**
1. Login successfully
2. Copy access token from sessionStorage
3. Call logout endpoint
4. Attempt API request with copied access token

**Expected Result:**
- Logout succeeds
- Access token still technically valid (stateless JWT)
- API request with old token may succeed until token expires (15 min)
- **Note:** This is expected behavior for stateless JWTs. For production, consider token blacklist.

**Severity if Fails:** Medium (Expected limitation - document as known issue)

---

### TC-AUTH-013: Login from Multiple Devices
**Area:** Auth  
**Preconditions:** 
- User account exists
- Multiple devices/browsers available

**Steps:**
1. Login from Device A
2. Login from Device B (same credentials)
3. Verify both sessions active
4. Logout from Device A
5. Verify Device B session still active

**Expected Result:**
- Both devices can login simultaneously
- Each device receives unique access token
- Each device receives same refresh token (or unique if rotation implemented)
- Logout from Device A does not affect Device B session
- Device B can continue using its access token until expiry

**Severity if Fails:** Low

---

### TC-AUTH-014: Logout from One Device - Others Remain Valid
**Area:** Auth  
**Preconditions:** 
- User logged in on multiple devices

**Steps:**
1. Login from Device A and Device B
2. Logout from Device A
3. Verify Device B can still make API calls

**Expected Result:**
- Device A logout clears its refresh token cookie
- Device B refresh token cookie remains valid
- Device B can continue making API calls
- Device B can refresh its access token
- **Note:** This is expected for stateless tokens. Document as design decision.

**Severity if Fails:** Low (Expected behavior)

---

### TC-AUTH-015: Token Storage - Not Accessible via JavaScript (Refresh Token)
**Area:** Security  
**Preconditions:** 
- User logged in successfully

**Steps:**
1. Login successfully
2. Open browser DevTools Console
3. Execute: `document.cookie`
4. Execute: `sessionStorage.getItem('refreshToken')`
5. Execute: `localStorage.getItem('refreshToken')`

**Expected Result:**
- Refresh token NOT visible in `document.cookie` (httpOnly flag prevents JS access)
- Refresh token NOT in `sessionStorage`
- Refresh token NOT in `localStorage`
- Only access token visible in `sessionStorage.getItem('auth_token')`
- Console cannot read refresh token value

**Severity if Fails:** Critical

---

### TC-AUTH-016: Token Storage - Access Token in sessionStorage
**Area:** Security  
**Preconditions:** 
- User logged in successfully

**Steps:**
1. Login successfully
2. Open browser DevTools
3. Check `sessionStorage` contents

**Expected Result:**
- Access token stored in `sessionStorage` as `auth_token`
- Token cleared when browser tab closes
- Token NOT in `localStorage`
- Token accessible to JavaScript (by design for SPA)

**Severity if Fails:** Medium

---

### TC-AUTH-017: Cookies are httpOnly + Secure
**Area:** Security  
**Preconditions:** 
- User logged in successfully
- Production environment (HTTPS)

**Steps:**
1. Login successfully
2. Open browser DevTools → Application → Cookies
3. Inspect `refreshToken` cookie properties

**Expected Result:**
- `refreshToken` cookie has `httpOnly` flag: true
- `refreshToken` cookie has `Secure` flag: true (in production)
- `refreshToken` cookie has `SameSite` flag: "Strict"
- Cookie not accessible via `document.cookie` in JavaScript

**Severity if Fails:** Critical

---

### TC-AUTH-018: Tokens Cleared on Logout
**Area:** Auth  
**Preconditions:** 
- User logged in successfully

**Steps:**
1. Login successfully
2. Verify tokens exist
3. Call logout endpoint
4. Check storage after logout

**Expected Result:**
- `sessionStorage.getItem('auth_token')` returns null
- `sessionStorage.getItem('csrf_token')` returns null
- `sessionStorage.getItem('user')` returns null
- `refreshToken` cookie removed (expires immediately)
- `auth_token` cookie removed (if exists)

**Severity if Fails:** High

---

### TC-AUTH-019: Old Tokens Rejected After Logout
**Area:** Security  
**Preconditions:** 
- User logged in successfully
- Access token copied

**Steps:**
1. Login successfully
2. Copy access token
3. Logout
4. Wait 1 minute
5. Make API request with copied access token

**Expected Result:**
- **Note:** Stateless JWTs cannot be invalidated server-side
- Old access token may work until natural expiry (15 min)
- Refresh token cookie cleared, so refresh endpoint will fail
- **Recommendation:** Document this limitation. Consider token blacklist for production.

**Severity if Fails:** Medium (Known limitation - document)

---

## 2. Authorization & Role-Based Access

### TC-AUTHZ-001: Student Role - Access Student Pages
**Area:** Authorization  
**Preconditions:** 
- Student user exists
- Student logged in successfully

**Steps:**
1. Login as student
2. Navigate to `/student/timetable`
3. Navigate to `/student/timetable/system/140`
4. Navigate to `/student/manual`

**Expected Result:**
- All student pages accessible
- Student timetable data loads correctly
- No 403 errors
- UI renders properly

**Severity if Fails:** Critical

---

### TC-AUTHZ-002: Student Role - Access Admin Routes Directly (URL)
**Area:** Authorization / Security  
**Preconditions:** 
- Student user logged in
- Student attempts to access admin routes

**Steps:**
1. Login as student
2. Manually navigate to `/admin/timetable` in browser
3. Observe behavior

**Expected Result:**
- Next.js middleware intercepts request
- Redirects to `/login?redirect=/admin/timetable`
- OR: Client-side auth check (`useAdminAuth`) detects non-admin
- Redirects to login
- Admin UI never rendered

**Severity if Fails:** Critical

---

### TC-AUTHZ-003: Student Role - Call Admin APIs Manually
**Area:** Authorization / Security  
**Preconditions:** 
- Student user logged in
- Student has valid access token

**Steps:**
1. Login as student
2. Open browser DevTools → Network tab
3. Manually call admin API: `GET /api/terms` with Authorization header
4. Observe response

**Expected Result:**
- Request includes valid access token
- Backend `requireAdmin` middleware checks role
- Middleware queries database for user role
- Returns 403 "Admin access required"
- Student role verified from database (not just JWT claim)

**Severity if Fails:** Critical

---

### TC-AUTHZ-004: Student Role - Modify IDs in Requests (IDOR)
**Area:** Authorization / Security  
**Preconditions:** 
- Student user logged in
- Admin-only resource exists with ID=1

**Steps:**
1. Login as student
2. Attempt to access: `GET /api/terms/1` (admin endpoint)
3. Attempt to modify: `PUT /api/terms/1` (admin endpoint)
4. Attempt to delete: `DELETE /api/terms/1` (admin endpoint)

**Expected Result:**
- All requests return 403 "Admin access required"
- Authorization check happens before resource access
- No data returned even if resource exists
- IDOR protection via role check, not just resource ownership

**Severity if Fails:** Critical

---

### TC-AUTHZ-005: Student Role - Export Only Own Schedules
**Area:** Authorization  
**Preconditions:** 
- Student user logged in
- Multiple schedules exist (own and others)

**Steps:**
1. Login as student
2. Navigate to schedule viewing page
3. Attempt to export schedules
4. Verify only own schedules exported

**Expected Result:**
- Only schedules belonging to student are visible
- Export PDF contains only student's schedules
- Cannot access other students' schedule IDs
- Backend filters schedules by user ID (if applicable)

**Severity if Fails:** High

---

### TC-AUTHZ-006: Student Role - Access Unpublished Terms
**Area:** Authorization  
**Preconditions:** 
- Student user logged in
- Term exists with `is_published: false`

**Steps:**
1. Login as student
2. Attempt to access unpublished term via API
3. Attempt to view unpublished term in UI

**Expected Result:**
- API returns 404 or 403 (term not found or access denied)
- UI does not display unpublished terms
- Term token validation fails for unpublished terms
- Only published terms (`is_published: true`) accessible

**Severity if Fails:** High

---

### TC-AUTHZ-007: Admin Role - Access Admin UI
**Area:** Authorization  
**Preconditions:** 
- Admin user exists
- Admin logged in successfully

**Steps:**
1. Login as admin
2. Navigate to `/admin/timetable`
3. Navigate to `/admin/timetable/courses`
4. Navigate to `/admin/timetable/instructors`

**Expected Result:**
- All admin pages accessible
- Admin UI renders correctly
- No redirects to login
- Admin data loads successfully

**Severity if Fails:** Critical

---

### TC-AUTHZ-008: Admin Role - Access Admin APIs
**Area:** Authorization  
**Preconditions:** 
- Admin user logged in

**Steps:**
1. Login as admin
2. Call admin API: `GET /api/terms`
3. Call admin API: `POST /api/terms`
4. Call admin API: `PUT /api/terms/1`
5. Call admin API: `DELETE /api/terms/1`

**Expected Result:**
- All admin API calls succeed (200/201)
- Admin middleware allows access
- Database role verification passes
- Full CRUD operations available

**Severity if Fails:** Critical

---

### TC-AUTHZ-009: Admin Role - Perform Admin-Only Actions
**Area:** Authorization  
**Preconditions:** 
- Admin user logged in

**Steps:**
1. Login as admin
2. Create new term
3. Create new course
4. Create new class
5. Assign courses to classes
6. Generate schedules

**Expected Result:**
- All admin actions succeed
- Data persisted correctly
- No authorization errors
- Full admin functionality available

**Severity if Fails:** Critical

---

### TC-AUTHZ-010: Admin Role - Attempt Student-Only Endpoints
**Area:** Authorization  
**Preconditions:** 
- Admin user logged in
- Student-specific endpoints exist

**Steps:**
1. Login as admin
2. Attempt to access student endpoints (if any exist)
3. Observe behavior

**Expected Result:**
- Admin can access student endpoints (if public)
- OR: Student endpoints return appropriate response
- No errors due to role mismatch
- System handles role appropriately

**Severity if Fails:** Low

---

### TC-AUTHZ-011: Role Escalation - Modify JWT Payload
**Area:** Security  
**Preconditions:** 
- Student user logged in
- Access token obtained

**Steps:**
1. Login as student
2. Copy JWT token from sessionStorage
3. Decode JWT (base64)
4. Modify `role` field from "student" to "admin"
5. Re-encode JWT (without signature)
6. Attempt admin API call with modified token

**Expected Result:**
- Modified token signature invalid
- JWT verification fails
- Returns 401 "Invalid or expired token"
- Cannot forge valid token without secret
- Even if payload modified, signature mismatch detected

**Severity if Fails:** Critical

---

### TC-AUTHZ-012: Role Escalation - Replay Old Tokens
**Area:** Security  
**Preconditions:** 
- Admin user logged in previously
- Old admin token saved

**Steps:**
1. Save admin token from previous session
2. Admin role changed to student in database
3. Attempt to use old admin token

**Expected Result:**
- Token signature valid
- `requireAdmin` middleware queries database
- Database returns current role: "student"
- Request rejected with 403 "Admin access required"
- Role verified from database, not JWT claim alone

**Severity if Fails:** Critical

---

### TC-AUTHZ-013: Role Escalation - Force Role in Request Body
**Area:** Security  
**Preconditions:** 
- Student user logged in

**Steps:**
1. Login as student
2. Call admin API: `POST /api/terms`
3. Include in body: `{ "role": "admin", "term_number": "2024-1" }`
4. Observe response

**Expected Result:**
- Request body role field ignored
- Authorization based on authenticated user's role from database
- Student role enforced
- Returns 403 "Admin access required"
- No privilege escalation possible

**Severity if Fails:** Critical

---

### TC-AUTHZ-014: Role Escalation - Remove Frontend Role Checks
**Area:** Security  
**Preconditions:** 
- Student user logged in

**Steps:**
1. Login as student
2. Open browser DevTools
3. Remove client-side role check code
4. Attempt to access admin UI

**Expected Result:**
- Client-side manipulation does not bypass server checks
- Admin API calls still require valid admin token
- Backend `requireAdmin` middleware enforces authorization
- Server-side protection prevents unauthorized access
- UI may load, but API calls fail with 403

**Severity if Fails:** Medium (UI exposure acceptable if API protected)

---

## 3. Admin Panel Test Cases

### TC-ADMIN-001: Admin UI Server-Side Protection
**Area:** Security  
**Preconditions:** 
- Next.js middleware configured
- Admin routes protected

**Steps:**
1. Attempt to access `/admin/timetable` without authentication
2. Observe middleware behavior

**Expected Result:**
- Next.js middleware intercepts request
- Checks for auth token in cookie or header
- No token found → redirects to `/login?redirect=/admin/timetable`
- Admin page never rendered server-side
- Server-side protection active

**Severity if Fails:** Critical

---

### TC-ADMIN-002: Access Admin Routes Without Auth
**Area:** Security  
**Preconditions:** 
- No user logged in
- Browser cleared of tokens

**Steps:**
1. Clear all cookies and sessionStorage
2. Navigate directly to `/admin/timetable`
3. Navigate directly to `/admin/timetable/courses`

**Expected Result:**
- Middleware redirects to login
- Admin UI never rendered
- No admin data exposed
- Login page shown with redirect parameter

**Severity if Fails:** Critical

---

### TC-ADMIN-003: Access Admin Routes with Expired Token
**Area:** Security  
**Preconditions:** 
- User previously logged in
- Access token expired (15+ minutes old)

**Steps:**
1. Use expired access token in sessionStorage
2. Navigate to `/admin/timetable`
3. Observe behavior

**Expected Result:**
- Middleware may allow page load (if only checks token existence)
- Client-side `useAdminAuth` hook calls `/api/auth/me`
- API returns 401 (expired token)
- Frontend attempts token refresh
- If refresh fails, redirects to login
- Admin UI not accessible with expired token

**Severity if Fails:** High

---

### TC-ADMIN-004: Access Admin Routes with Student Token
**Area:** Security  
**Preconditions:** 
- Student user logged in
- Student has valid access token

**Steps:**
1. Login as student
2. Navigate to `/admin/timetable`
3. Observe behavior

**Expected Result:**
- Middleware may allow (checks token existence)
- Client-side `useAdminAuth` calls `/api/auth/me`
- Backend verifies user role from database
- Returns user data with role: "student"
- Frontend detects non-admin role
- Redirects to login or shows error
- Admin UI not accessible

**Severity if Fails:** Critical

---

### TC-ADMIN-005: Admin-Only Data Visibility
**Area:** Authorization  
**Preconditions:** 
- Admin user logged in

**Steps:**
1. Login as admin
2. Access admin dashboard
3. Verify admin-specific data visible
4. Verify student data not mixed

**Expected Result:**
- Admin sees all terms, courses, classes
- Admin can manage all resources
- Admin-specific UI elements visible
- Data filtered appropriately for admin role

**Severity if Fails:** Medium

---

### TC-ADMIN-006: Admin Actions Auditability
**Area:** Security / Compliance  
**Preconditions:** 
- Admin user logged in
- Logging system active

**Steps:**
1. Login as admin
2. Perform admin actions (create term, delete course, etc.)
3. Check server logs

**Expected Result:**
- All admin actions logged server-side
- Logs include: user ID, action, timestamp, resource
- Sensitive operations (delete, modify) logged with details
- Logs do not contain passwords or tokens
- Audit trail available for compliance

**Severity if Fails:** Medium

---

### TC-ADMIN-007: Error Handling - No Stack Traces
**Area:** Security  
**Preconditions:** 
- Production environment (`NODE_ENV=production`)
- Admin user logged in

**Steps:**
1. Login as admin
2. Trigger error (invalid input, database error, etc.)
3. Observe error response

**Expected Result:**
- Error response does not include stack trace
- Error response does not include internal file paths
- Generic error message: "Internal server error" or "Request failed"
- Detailed errors only in server logs (not client)
- No information disclosure

**Severity if Fails:** High

---

## 4. Timetable Generation Logic

### TC-TIMETABLE-001: Generate Schedule with Valid Inputs
**Area:** Business Logic  
**Preconditions:** 
- Term exists and published
- Courses exist for term
- System type valid (140/160/180)

**Steps:**
1. Login as student
2. Navigate to timetable generation page
3. Select valid term
4. Select valid system type
5. Select valid courses
6. Click "Generate Schedules"

**Expected Result:**
- Schedule generation succeeds
- Valid schedules returned
- Schedules have no time conflicts
- Schedules respect capacity limits
- Response time acceptable (< 30 seconds)

**Severity if Fails:** Critical

---

### TC-TIMETABLE-002: Generate Schedule - Multiple Systems (140/160/180)
**Area:** Business Logic  
**Preconditions:** 
- Term exists
- Courses available for each system

**Steps:**
1. Generate schedule for system 140
2. Generate schedule for system 160
3. Generate schedule for system 180
4. Verify each generation succeeds

**Expected Result:**
- All system types generate successfully
- System-specific courses included correctly
- Schedules match system requirements
- No cross-system contamination

**Severity if Fails:** Critical

---

### TC-TIMETABLE-003: Generate Schedule - Different Term Types
**Area:** Business Logic  
**Preconditions:** 
- Multiple terms exist (Fall, Spring, Summer)

**Steps:**
1. Generate schedule for Fall term
2. Generate schedule for Spring term
3. Generate schedule for Summer term

**Expected Result:**
- All term types generate successfully
- Term-specific data loaded correctly
- No term data mixing
- Schedules appropriate for term

**Severity if Fails:** High

---

### TC-TIMETABLE-004: Generate Schedule - L / S / LB Combinations
**Area:** Business Logic  
**Preconditions:** 
- Courses with Lecture (L), Section (S), Lab (LB) components exist

**Steps:**
1. Select courses with L components
2. Select courses with S components
3. Select courses with LB components
4. Generate schedules

**Expected Result:**
- All component types included correctly
- Component combinations valid
- No missing components
- Schedules show all components

**Severity if Fails:** High

---

### TC-TIMETABLE-005: Generate Schedule - Empty Course Selection
**Area:** Business Logic / Edge Case  
**Preconditions:** 
- Term exists
- User on generation page

**Steps:**
1. Navigate to generation page
2. Select term
3. Select system type
4. Do not select any courses
5. Click "Generate Schedules"

**Expected Result:**
- Validation error: "Please select at least one course"
- Generation prevented
- User-friendly error message
- No API call made

**Severity if Fails:** Medium

---

### TC-TIMETABLE-006: Generate Schedule - Duplicate Course IDs
**Area:** Business Logic / Edge Case  
**Preconditions:** 
- Term exists
- Courses available

**Steps:**
1. Select course ID: 1
2. Select same course ID: 1 again (duplicate)
3. Attempt to generate

**Expected Result:**
- Duplicate course IDs filtered out
- Each course included only once
- Generation succeeds with unique courses
- OR: Validation error if duplicates not allowed

**Severity if Fails:** Medium

---

### TC-TIMETABLE-007: Generate Schedule - Invalid System Type
**Area:** Business Logic / Validation  
**Preconditions:** 
- Term exists

**Steps:**
1. Select invalid system type: "999" or "invalid"
2. Attempt to generate schedules

**Expected Result:**
- Validation error: "Invalid system type"
- Generation prevented
- Only valid system types (140/160/180) accepted
- Error message clear

**Severity if Fails:** Medium

---

### TC-TIMETABLE-008: Generate Schedule - Invalid Term ID
**Area:** Business Logic / Validation  
**Preconditions:** 
- Invalid term ID

**Steps:**
1. Attempt to generate with term ID: 99999
2. Observe response

**Expected Result:**
- Returns 404 "Term not found"
- OR: Validation error for invalid ID format
- No schedule generation attempted
- Error handled gracefully

**Severity if Fails:** Medium

---

### TC-TIMETABLE-009: Generate Schedule - Conflicting Schedules
**Area:** Business Logic  
**Preconditions:** 
- Courses selected with time conflicts
- Generation algorithm should detect conflicts

**Steps:**
1. Select courses that have overlapping time slots
2. Generate schedules
3. Verify conflict detection

**Expected Result:**
- Algorithm detects conflicts
- Conflicting schedules not generated
- OR: Multiple schedule options provided (some with conflicts marked)
- User informed of conflicts
- Valid schedules prioritized

**Severity if Fails:** High

---

### TC-TIMETABLE-010: Generate Schedule - Exceeding Capacity
**Area:** Business Logic  
**Preconditions:** 
- Class has capacity limit (e.g., 30 students)
- More students attempt to enroll

**Steps:**
1. Select course with limited capacity
2. Generate schedule when capacity exceeded
3. Observe behavior

**Expected Result:**
- Capacity limits respected
- Schedules generated only if capacity available
- OR: Schedules marked as "full" or "waitlist"
- Capacity validation occurs
- User informed of capacity issues

**Severity if Fails:** High

---

### TC-TIMETABLE-011: Generate Schedule - Missing Prerequisites
**Area:** Business Logic  
**Preconditions:** 
- Course requires prerequisite
- Prerequisite not selected

**Steps:**
1. Select advanced course without prerequisite
2. Generate schedules
3. Verify prerequisite validation

**Expected Result:**
- Prerequisite validation occurs
- Error: "Missing prerequisite: [course]"
- OR: Warning shown, generation continues
- Prerequisite rules enforced

**Severity if Fails:** Medium

---

### TC-TIMETABLE-012: Generate Schedule - Excessive Number of Courses
**Area:** Business Logic / Performance  
**Preconditions:** 
- Maximum courses limit defined

**Steps:**
1. Select 50+ courses (if limit is 20)
2. Attempt to generate

**Expected Result:**
- Validation error: "Maximum 20 courses allowed"
- OR: Generation succeeds but may be slow
- Reasonable limit enforced
- Performance considered

**Severity if Fails:** Medium

---

### TC-TIMETABLE-013: Generate Schedule - Large Payload Size
**Area:** Performance / Security  
**Preconditions:** 
- Payload size limit: 10MB

**Steps:**
1. Create request with extremely large course selection array
2. Send generation request
3. Observe response

**Expected Result:**
- Request size validated
- Error: "Request payload too large"
- OR: Request accepted but processed with limits
- DoS prevention active
- Server stability maintained

**Severity if Fails:** High

---

### TC-TIMETABLE-014: Generate Schedule - Repeated Rapid Requests (DoS)
**Area:** Performance / Security  
**Preconditions:** 
- Rate limiter: 10 requests per minute
- Schedule generation endpoint protected

**Steps:**
1. Make 11 rapid generation requests
2. Observe rate limiting behavior

**Expected Result:**
- First 10 requests succeed (or process)
- 11th request returns 429 "Rate limit exceeded"
- Rate limit headers present
- Server protected from DoS
- Retry-after header provided

**Severity if Fails:** Critical

---

## 5. Schedule Viewing & Data Access

### TC-VIEW-001: View Own Schedules
**Area:** Authorization  
**Preconditions:** 
- Student logged in
- Schedules generated for student

**Steps:**
1. Login as student
2. Navigate to schedule viewing page
3. View generated schedules

**Expected Result:**
- Own schedules displayed correctly
- Schedule data accurate
- UI renders properly
- No errors

**Severity if Fails:** Critical

---

### TC-VIEW-002: Attempt to View Others' Schedules
**Area:** Security / IDOR  
**Preconditions:** 
- Student A logged in
- Student B's schedule exists with ID=999

**Steps:**
1. Login as Student A
2. Attempt to access: `/api/timetable/schedules/999` (Student B's schedule)
3. Observe response

**Expected Result:**
- Returns 403 "Access denied" or 404 "Not found"
- Student A cannot access Student B's schedules
- IDOR protection active
- Resource ownership validated

**Severity if Fails:** Critical

---

### TC-VIEW-003: Modify Schedule ID in URL
**Area:** Security / IDOR  
**Preconditions:** 
- Student logged in
- Own schedule ID: 1
- Other schedule ID: 999

**Steps:**
1. Login as student
2. View own schedule: `/student/timetable/[termId]/schedules`
3. Modify URL parameter to another schedule ID
4. Attempt to access

**Expected Result:**
- URL manipulation detected
- Backend validates schedule ownership
- Returns 403 or 404
- Cannot access unauthorized schedules
- Client-side ID not trusted

**Severity if Fails:** Critical

---

### TC-VIEW-004: Access Unpublished Terms
**Area:** Authorization  
**Preconditions:** 
- Term exists with `is_published: false`
- Student logged in

**Steps:**
1. Login as student
2. Attempt to access unpublished term via API
3. Attempt to view unpublished term in UI

**Expected Result:**
- API returns 404 "Term not found" or 403 "Access denied"
- UI does not display unpublished terms
- Term token validation fails
- Only published terms accessible

**Severity if Fails:** High

---

### TC-VIEW-005: Access Deleted Terms
**Area:** Business Logic  
**Preconditions:** 
- Term was deleted
- Student attempts to access

**Steps:**
1. Login as student
2. Attempt to access deleted term ID
3. Observe response

**Expected Result:**
- Returns 404 "Term not found"
- No data returned
- Error handled gracefully
- No server errors

**Severity if Fails:** Medium

---

### TC-VIEW-006: Access with Malformed IDs
**Area:** Validation  
**Preconditions:** 
- Student logged in

**Steps:**
1. Attempt to access: `/api/timetable/terms/abc` (non-numeric)
2. Attempt to access: `/api/timetable/terms/-1` (negative)
3. Attempt to access: `/api/timetable/terms/0` (zero)

**Expected Result:**
- Validation error: "Invalid ID format"
- Returns 400 "Bad Request"
- No database query with invalid ID
- Input sanitized

**Severity if Fails:** Medium

---

### TC-VIEW-007: Pagination Boundaries
**Area:** Business Logic  
**Preconditions:** 
- Many schedules exist
- Pagination implemented

**Steps:**
1. View schedules page 1
2. Navigate to last page
3. Attempt to go beyond last page
4. Attempt negative page number

**Expected Result:**
- Pagination works correctly
- Last page shows correct data
- Beyond last page returns empty or error
- Negative page handled gracefully
- Page boundaries validated

**Severity if Fails:** Low

---

### TC-VIEW-008: Empty Dataset Handling
**Area:** Business Logic  
**Preconditions:** 
- Student logged in
- No schedules generated yet

**Steps:**
1. Login as student
2. Navigate to schedule viewing page
3. Observe empty state

**Expected Result:**
- Empty state message displayed
- No errors thrown
- UI handles empty data gracefully
- User-friendly message: "No schedules found"

**Severity if Fails:** Low

---

## 6. PDF Export Test Cases

### TC-PDF-001: Export Single Schedule
**Area:** Export / Functional  
**Preconditions:** 
- Student logged in
- At least one schedule generated
- jsPDF library loaded

**Steps:**
1. Login as student
2. Navigate to schedule viewing page
3. Click "Download PDF" for one schedule
4. Verify PDF generated

**Expected Result:**
- PDF downloads successfully
- PDF contains schedule data
- File name: `Schedule_Option_X_System_Y_TermZ.pdf` (or similar)
- PDF opens correctly in PDF viewer
- Content matches UI display

**Severity if Fails:** High

---

### TC-PDF-002: Export All Schedules
**Area:** Export / Functional  
**Preconditions:** 
- Student logged in
- Multiple schedules generated

**Steps:**
1. Login as student
2. Navigate to schedule viewing page
3. Click "Download All Schedules as Single PDF"
4. Verify PDF generated

**Expected Result:**
- Single PDF file generated
- All schedules included in PDF
- File name: `All_Schedules_Term_X.pdf` (or similar)
- PDF contains multiple pages (one per schedule)
- All data accurate

**Severity if Fails:** High

---

### TC-PDF-003: Export Empty Schedule
**Area:** Export / Edge Case  
**Preconditions:** 
- Student logged in
- Schedule exists but empty (no sessions)

**Steps:**
1. Login as student
2. Navigate to empty schedule
3. Attempt to export PDF

**Expected Result:**
- Export button disabled (if no data)
- OR: PDF generated with empty schedule message
- No errors thrown
- Graceful handling of empty data

**Severity if Fails:** Low

---

### TC-PDF-004: Export Large Schedule
**Area:** Export / Performance  
**Preconditions:** 
- Student logged in
- Schedule with many sessions (50+)

**Steps:**
1. Login as student
2. Navigate to large schedule
3. Export PDF
4. Measure generation time

**Expected Result:**
- PDF generates successfully
- Generation time acceptable (< 10 seconds)
- PDF file size reasonable (< 5MB)
- All data included correctly
- No memory issues

**Severity if Fails:** Medium

---

### TC-PDF-005: Export After Token Refresh
**Area:** Export / Auth  
**Preconditions:** 
- Student logged in
- Access token expired
- Refresh token valid

**Steps:**
1. Login as student
2. Wait for access token to expire (or manually expire)
3. Navigate to schedule page (triggers refresh)
4. Export PDF

**Expected Result:**
- Token refresh happens automatically
- PDF export succeeds after refresh
- No authentication errors
- Seamless user experience

**Severity if Fails:** Medium

---

### TC-PDF-006: Export After Logout (Must Fail)
**Area:** Export / Security  
**Preconditions:** 
- Student logged in
- Schedule data loaded

**Steps:**
1. Login as student
2. Load schedule page
3. Logout
4. Attempt to export PDF (if UI still accessible)

**Expected Result:**
- Logout clears tokens
- PDF export fails (if attempted)
- Error: "Not authenticated" or redirect to login
- Cannot export after logout
- Security enforced

**Severity if Fails:** High

---

### TC-PDF-007: PDF Matches Site UI Colors
**Area:** Export / Visual Consistency  
**Preconditions:** 
- Student logged in
- Schedule with different component types (L/S/LB)

**Steps:**
1. Login as student
2. View schedule in UI (note colors)
3. Export PDF
4. Compare PDF colors to UI

**Expected Result:**
- PDF colors match UI colors
- L components: consistent color
- S components: consistent color
- LB components: consistent color
- Color scheme preserved
- Brand consistency maintained

**Severity if Fails:** Low

---

### TC-PDF-008: Font Sizes Readable
**Area:** Export / Visual Consistency  
**Preconditions:** 
- Student logged in
- Schedule exported

**Steps:**
1. Export PDF
2. Open PDF in viewer
3. Verify font sizes

**Expected Result:**
- Font sizes readable (minimum 10pt)
- Headers clearly visible
- Table text legible
- No text too small
- Professional appearance

**Severity if Fails:** Low

---

### TC-PDF-009: Layout Alignment Correct
**Area:** Export / Visual Consistency  
**Preconditions:** 
- Student logged in
- Schedule exported

**Steps:**
1. Export PDF
2. Open PDF
3. Verify layout

**Expected Result:**
- Tables aligned correctly
- Text properly formatted
- Margins consistent
- No overlapping content
- Professional layout

**Severity if Fails:** Low

---

### TC-PDF-010: No Clipped Content
**Area:** Export / Visual Consistency  
**Preconditions:** 
- Student logged in
- Schedule with long course names

**Steps:**
1. Export PDF with long course names
2. Open PDF
3. Verify all content visible

**Expected Result:**
- All text visible (no clipping)
- Long names wrapped or truncated appropriately
- Tables fit page width
- No content cut off
- All data accessible

**Severity if Fails:** Medium

---

### TC-PDF-011: Page Breaks Handled Correctly
**Area:** Export / Visual Consistency  
**Preconditions:** 
- Student logged in
- Large schedule (multiple pages)

**Steps:**
1. Export large schedule PDF
2. Open PDF
3. Verify page breaks

**Expected Result:**
- Page breaks occur at logical points
- Tables not split awkwardly
- Headers repeated on each page (if applicable)
- Professional pagination

**Severity if Fails:** Low

---

### TC-PDF-012: L / S / LB Color Consistency
**Area:** Export / Visual Consistency  
**Preconditions:** 
- Student logged in
- Schedule with all component types

**Steps:**
1. Export PDF with L, S, LB components
2. Verify color coding

**Expected Result:**
- L components: consistent color in PDF
- S components: consistent color in PDF
- LB components: consistent color in PDF
- Colors match UI exactly
- Visual consistency maintained

**Severity if Fails:** Low

---

### TC-PDF-013: Dark Mode Preserved (if applicable)
**Area:** Export / Visual Consistency  
**Preconditions:** 
- Student logged in
- Dark mode enabled in UI

**Steps:**
1. Enable dark mode
2. Export PDF
3. Verify PDF appearance

**Expected Result:**
- PDF uses appropriate colors for printing
- OR: PDF uses light theme (better for printing)
- Text readable in PDF
- Colors appropriate for document

**Severity if Fails:** Low

---

### TC-PDF-014: Export Other Users' Schedules
**Area:** Export / Security  
**Preconditions:** 
- Student A logged in
- Student B's schedule ID known: 999

**Steps:**
1. Login as Student A
2. Attempt to export Student B's schedule
3. Modify schedule ID in export request

**Expected Result:**
- Cannot access other user's schedule data
- Export fails with 403 or 404
- Authorization check prevents unauthorized export
- Only own schedules exportable

**Severity if Fails:** Critical

---

### TC-PDF-015: Manipulate Export Parameters
**Area:** Export / Security  
**Preconditions:** 
- Student logged in

**Steps:**
1. Login as student
2. Open browser DevTools
3. Modify export API call parameters
4. Attempt to export with modified parameters

**Expected Result:**
- Parameters validated server-side
- Invalid parameters rejected
- Export fails with validation error
- Cannot manipulate export via parameters
- Security enforced

**Severity if Fails:** High

---

### TC-PDF-016: Call Export API Unauthenticated
**Area:** Export / Security  
**Preconditions:** 
- No user logged in

**Steps:**
1. Clear all authentication
2. Attempt to call export API directly
3. Observe response

**Expected Result:**
- Returns 401 "Authentication required"
- No PDF generated
- Export endpoint protected
- Authentication enforced

**Severity if Fails:** Critical

---

### TC-PDF-017: Export Unpublished Data
**Area:** Export / Security  
**Preconditions:** 
- Student logged in
- Unpublished term exists

**Steps:**
1. Login as student
2. Attempt to export schedule from unpublished term
3. Observe behavior

**Expected Result:**
- Cannot access unpublished term data
- Export fails with 404 or 403
- Unpublished data protected
- Only published data exportable

**Severity if Fails:** High

---

## 7. Frontend Security Test Cases

### TC-FRONTEND-001: DevTools Tampering - Remove Client-Side Checks
**Area:** Security  
**Preconditions:** 
- Student logged in
- Browser DevTools open

**Steps:**
1. Login as student
2. Open DevTools → Sources
3. Remove or modify client-side auth check code
4. Attempt to access admin routes

**Expected Result:**
- Client-side code manipulation possible
- BUT: Server-side checks still enforce security
- Admin API calls fail with 403
- UI may load, but functionality blocked
- Server-side protection prevents actual access

**Severity if Fails:** Medium (Expected - server-side protection is key)

---

### TC-FRONTEND-002: Modify Request Payloads
**Area:** Security  
**Preconditions:** 
- Student logged in
- Browser DevTools open

**Steps:**
1. Login as student
2. Open DevTools → Network tab
3. Intercept API request
4. Modify request payload (change IDs, add fields)
5. Send modified request

**Expected Result:**
- Modified payloads validated server-side
- Invalid data rejected
- Authorization checks prevent unauthorized changes
- Server-side validation prevents manipulation
- Only valid, authorized requests succeed

**Severity if Fails:** High

---

### TC-FRONTEND-003: Replay Requests
**Area:** Security  
**Preconditions:** 
- Admin logged in
- Admin action performed

**Steps:**
1. Login as admin
2. Perform action (create term)
3. Copy request from Network tab
4. Logout
5. Replay request with old token

**Expected Result:**
- Old token expired or invalid
- Replayed request fails with 401
- CSRF token prevents replay (if applicable)
- Request timestamp validation (if implemented)
- Replay attacks prevented

**Severity if Fails:** Medium

---

### TC-FRONTEND-004: Change Role Flags in Memory
**Area:** Security  
**Preconditions:** 
- Student logged in
- Browser DevTools open

**Steps:**
1. Login as student
2. Open DevTools → Console
3. Modify role in memory: `sessionStorage.setItem('user', JSON.stringify({role: 'admin'}))`
4. Attempt admin actions

**Expected Result:**
- Client-side role change possible
- BUT: Server-side role verification prevents access
- Admin API calls check database role
- Returns 403 "Admin access required"
- Client-side role not trusted

**Severity if Fails:** Critical

---

### TC-FRONTEND-005: XSS Injection Attempts
**Area:** Security  
**Preconditions:** 
- User logged in
- Input fields available

**Steps:**
1. Login as user
2. Attempt XSS in input fields:
   - `<script>alert('XSS')</script>`
   - `<img src=x onerror=alert('XSS')>`
   - `javascript:alert('XSS')`
3. Submit form

**Expected Result:**
- Input sanitized/escaped
- XSS payloads not executed
- Special characters encoded
- Content Security Policy prevents execution
- No script injection possible

**Severity if Fails:** Critical

---

### TC-FRONTEND-006: CSP Enforcement
**Area:** Security  
**Preconditions:** 
- Application running
- CSP headers configured

**Steps:**
1. Open browser DevTools → Console
2. Attempt to inject script: `eval('alert("XSS")')`
3. Attempt inline script execution
4. Check CSP headers in Network tab

**Expected Result:**
- CSP headers present in response
- Inline scripts blocked (if configured)
- `eval()` blocked
- External scripts only from allowed sources
- CSP violations logged (if reporting configured)

**Severity if Fails:** High

---

### TC-FRONTEND-007: sessionStorage Data Exposure
**Area:** Security  
**Preconditions:** 
- User logged in
- Data in sessionStorage

**Steps:**
1. Login as user
2. Open DevTools → Application → Session Storage
3. Inspect stored data
4. Check for sensitive information

**Expected Result:**
- Access token stored (acceptable for SPA)
- User data stored (non-sensitive)
- NO passwords stored
- NO refresh tokens stored (in httpOnly cookie)
- Sensitive data not exposed

**Severity if Fails:** High

---

## 8. API Security Test Cases

### TC-API-001: Missing Auth Header
**Area:** Security  
**Preconditions:** 
- API endpoint requires authentication

**Steps:**
1. Make API request without Authorization header
2. Observe response

**Expected Result:**
- Returns 401 "Authentication required"
- No data returned
- Error message generic (no information disclosure)
- Endpoint protected

**Severity if Fails:** Critical

---

### TC-API-002: Invalid Token
**Area:** Security  
**Preconditions:** 
- API endpoint requires authentication

**Steps:**
1. Make API request with invalid token: `Bearer invalid_token_12345`
2. Observe response

**Expected Result:**
- Returns 401 "Invalid or expired token"
- JWT verification fails
- No data returned
- Error message generic

**Severity if Fails:** Critical

---

### TC-API-003: Expired Token
**Area:** Security  
**Preconditions:** 
- Access token expired (15+ minutes old)

**Steps:**
1. Use expired access token
2. Make API request
3. Observe response

**Expected Result:**
- Returns 401 "Invalid or expired token"
- Token expiry verified
- No data returned
- Frontend should trigger refresh

**Severity if Fails:** High

---

### TC-API-004: Modified Token Signature
**Area:** Security  
**Preconditions:** 
- Valid token obtained

**Steps:**
1. Copy valid JWT token
2. Modify signature (last part)
3. Make API request with modified token

**Expected Result:**
- Returns 401 "Invalid or expired token"
- Signature verification fails
- JWT library detects tampering
- No data returned

**Severity if Fails:** Critical

---

### TC-API-005: SQL Injection Attempts
**Area:** Security  
**Preconditions:** 
- API endpoint with user input

**Steps:**
1. Attempt SQL injection in parameters:
   - `termId=1' OR '1'='1`
   - `termId=1; DROP TABLE terms; --`
   - `termId=1' UNION SELECT * FROM users --`
2. Observe response

**Expected Result:**
- Input sanitized/parameterized
- No SQL injection possible
- TypeORM/parameterized queries prevent injection
- Returns validation error or 400
- Database remains intact

**Severity if Fails:** Critical

---

### TC-API-006: NoSQL Injection Attempts
**Area:** Security  
**Preconditions:** 
- API endpoint with JSON body

**Steps:**
1. Send NoSQL injection in JSON:
   - `{"termId": {"$ne": null}}`
   - `{"termId": {"$gt": 0}}`
2. Observe response

**Expected Result:**
- Input validation prevents NoSQL injection
- TypeORM/PostgreSQL not vulnerable to NoSQL
- Returns validation error
- No injection possible

**Severity if Fails:** Low (PostgreSQL not vulnerable, but test anyway)

---

### TC-API-007: Long Input Strings
**Area:** Security / Performance  
**Preconditions:** 
- API endpoint with string input
- Max length: 200 characters

**Steps:**
1. Send input with 1000+ characters
2. Observe response

**Expected Result:**
- Input length validated
- Returns 400 "Input length exceeds maximum allowed"
- Request rejected before processing
- DoS prevention active
- Server stability maintained

**Severity if Fails:** High

---

### TC-API-008: Malformed JSON
**Area:** Security  
**Preconditions:** 
- API endpoint expects JSON body

**Steps:**
1. Send malformed JSON:
   - `{"termId": 1,}` (trailing comma)
   - `{termId: 1}` (unquoted key)
   - `{"termId": }` (missing value)
2. Observe response

**Expected Result:**
- JSON parser handles errors gracefully
- Returns 400 "Invalid JSON" or "Bad Request"
- No server errors
- Error message generic

**Severity if Fails:** Medium

---

### TC-API-009: Unexpected Data Types
**Area:** Security / Validation  
**Preconditions:** 
- API endpoint expects integer ID

**Steps:**
1. Send string instead of integer: `{"termId": "abc"}`
2. Send array instead of integer: `{"termId": [1,2,3]}`
3. Send object instead of integer: `{"termId": {"id": 1}}`

**Expected Result:**
- Type validation occurs
- Returns 400 "Invalid ID format" or validation error
- Input sanitized
- Only expected types accepted

**Severity if Fails:** Medium

---

### TC-API-010: Rate Limit Enforcement
**Area:** Security / Performance  
**Preconditions:** 
- Rate limiter: 100 requests per minute
- API endpoint protected

**Steps:**
1. Make 101 rapid requests
2. Observe rate limiting

**Expected Result:**
- First 100 requests succeed
- 101st request returns 429 "Rate limit exceeded"
- Rate limit headers present
- Retry-after header provided
- Server protected from abuse

**Severity if Fails:** Critical

---

### TC-API-011: CORS Origin Abuse
**Area:** Security  
**Preconditions:** 
- CORS configured with allowed origins
- Malicious origin: `https://evil.com`

**Steps:**
1. Make request from `https://evil.com`
2. Include credentials (cookies)
3. Observe CORS behavior

**Expected Result:**
- CORS check fails
- Request blocked by browser
- OR: Server rejects request
- No data returned
- Only allowed origins accepted

**Severity if Fails:** Critical

---

### TC-API-012: Requests Without Origin Header
**Area:** Security  
**Preconditions:** 
- CORS configured
- Production mode (strict CORS)

**Steps:**
1. Make request without Origin header (e.g., Postman, curl)
2. Observe response

**Expected Result:**
- In production: Request may be rejected (if origin required)
- In development: Request allowed (dev mode)
- CORS policy enforced appropriately
- Security maintained

**Severity if Fails:** Medium

---

## 9. CSRF Protection

### TC-CSRF-001: POST Request from External Origin
**Area:** Security  
**Preconditions:** 
- User logged in on legitimate site
- Malicious site: `https://evil.com`

**Steps:**
1. User logged in on legitimate site
2. User visits `https://evil.com`
3. Malicious site makes POST request to API
4. Observe CSRF protection

**Expected Result:**
- CSRF token required for POST requests
- Malicious site cannot obtain CSRF token (SameSite cookie)
- Request fails with 403 "CSRF token required"
- CSRF attack prevented

**Severity if Fails:** Critical

---

### TC-CSRF-002: Form Submission Without CSRF Token
**Area:** Security  
**Preconditions:** 
- User logged in
- Form submission endpoint protected

**Steps:**
1. Login as user
2. Make POST request without CSRF token header
3. Observe response

**Expected Result:**
- Returns 403 "CSRF token required"
- Request rejected
- CSRF protection active
- Token validation enforced

**Severity if Fails:** Critical

---

### TC-CSRF-003: SameSite Cookie Enforcement
**Area:** Security  
**Preconditions:** 
- User logged in
- Refresh token in httpOnly cookie

**Steps:**
1. Login as user
2. Check cookie properties in DevTools
3. Verify SameSite setting

**Expected Result:**
- Refresh token cookie has `SameSite=Strict`
- Cookie not sent in cross-site requests
- CSRF protection via SameSite
- Security headers correct

**Severity if Fails:** Critical

---

### TC-CSRF-004: Authenticated User Tricked into Action
**Area:** Security  
**Preconditions:** 
- User logged in
- Malicious site attempts CSRF

**Steps:**
1. User logged in on legitimate site
2. User visits malicious site
3. Malicious site includes form that submits to API
4. User unknowingly triggers submission

**Expected Result:**
- CSRF token required
- Malicious site cannot obtain token
- Request fails
- User action not executed
- CSRF attack prevented

**Severity if Fails:** Critical

---

### TC-CSRF-005: Cross-Origin Fetch Attempts
**Area:** Security  
**Preconditions:** 
- User logged in
- External origin attempts fetch

**Steps:**
1. Login as user
2. From external origin, attempt: `fetch('https://api.example.com/api/terms', {method: 'POST', credentials: 'include'})`
3. Observe behavior

**Expected Result:**
- CORS prevents request (if origin not allowed)
- OR: CSRF token required
- Request fails
- Cross-origin attacks prevented

**Severity if Fails:** Critical

---

## 10. Error Handling & Logging

### TC-ERROR-001: 401 vs 403 Correctness
**Area:** Security  
**Preconditions:** 
- API endpoints with different auth states

**Steps:**
1. Make request without token → should be 401
2. Make request with invalid token → should be 401
3. Make request with student token to admin endpoint → should be 403
4. Verify status codes

**Expected Result:**
- No token: 401 "Authentication required"
- Invalid token: 401 "Invalid or expired token"
- Unauthorized role: 403 "Admin access required"
- Status codes correct and consistent
- Error messages appropriate

**Severity if Fails:** High

---

### TC-ERROR-002: Generic Error Messages
**Area:** Security  
**Preconditions:** 
- Production environment
- Error occurs

**Steps:**
1. Trigger various errors (database, validation, etc.)
2. Observe error messages in production

**Expected Result:**
- Generic messages: "Internal server error" or "Request failed"
- No stack traces exposed
- No file paths exposed
- No database errors exposed
- No sensitive information leaked

**Severity if Fails:** High

---

### TC-ERROR-003: No Stack Traces in Production
**Area:** Security  
**Preconditions:** 
- Production environment (`NODE_ENV=production`)
- Error occurs

**Steps:**
1. Trigger server error
2. Check error response

**Expected Result:**
- Response does not include `stack` field
- Response does not include file paths
- Generic error message only
- Detailed errors only in server logs
- No information disclosure

**Severity if Fails:** Critical

---

### TC-ERROR-004: Consistent Error Format
**Area:** API Design  
**Preconditions:** 
- Multiple API endpoints
- Various error scenarios

**Steps:**
1. Trigger errors from different endpoints
2. Verify error response format

**Expected Result:**
- Consistent format: `{success: false, message: "..."}`
- Status codes match error type
- Error structure uniform
- Easy to parse client-side

**Severity if Fails:** Low

---

### TC-ERROR-005: Sensitive Data Not Logged
**Area:** Security  
**Preconditions:** 
- Logging system active
- User operations performed

**Steps:**
1. Login with password
2. Perform various operations
3. Check server logs

**Expected Result:**
- Passwords never logged
- Tokens never logged (or masked)
- Sensitive data redacted
- Only operation metadata logged
- Security maintained

**Severity if Fails:** Critical

---

### TC-ERROR-006: Failed Auth Attempts Logged
**Area:** Security / Compliance  
**Preconditions:** 
- Authentication endpoint
- Failed login attempts

**Steps:**
1. Attempt multiple failed logins
2. Check server logs

**Expected Result:**
- Failed attempts logged
- Logs include: IP address, timestamp, registration number (or hash)
- Rate limit tracking logged
- Security events recorded
- Audit trail available

**Severity if Fails:** Medium

---

## 11. Performance & Stability

### TC-PERF-001: Concurrent Users
**Area:** Performance  
**Preconditions:** 
- Multiple users available
- Load testing tools

**Steps:**
1. Simulate 50 concurrent users
2. All users login simultaneously
3. All users perform operations
4. Monitor server performance

**Expected Result:**
- All requests handled successfully
- Response times acceptable (< 2 seconds)
- No server crashes
- Database connections managed (pool size: 100)
- System stable under load

**Severity if Fails:** High

---

### TC-PERF-002: Concurrent Schedule Generation
**Area:** Performance  
**Preconditions:** 
- Multiple users
- Schedule generation endpoint

**Steps:**
1. 10 users generate schedules simultaneously
2. Monitor server resources
3. Verify all generations complete

**Expected Result:**
- All generations succeed
- Rate limiting prevents overload
- Server resources managed
- No timeouts
- Acceptable response times

**Severity if Fails:** High

---

### TC-PERF-003: Rapid Refresh Token Usage
**Area:** Performance  
**Preconditions:** 
- User logged in
- Access token expired

**Steps:**
1. Expire access token
2. Make 20 rapid API requests
3. Each triggers token refresh
4. Observe behavior

**Expected Result:**
- Token refresh happens efficiently
- No duplicate refresh calls
- Rate limiting prevents abuse
- All requests eventually succeed
- Performance acceptable

**Severity if Fails:** Medium

---

### TC-PERF-004: Memory Usage Under Load
**Area:** Performance  
**Preconditions:** 
- Server running
- Load testing active

**Steps:**
1. Apply sustained load (100 req/sec for 5 minutes)
2. Monitor memory usage
3. Check for memory leaks

**Expected Result:**
- Memory usage stable
- No memory leaks
- Garbage collection working
- Memory usage within limits
- System remains stable

**Severity if Fails:** High

---

### TC-PERF-005: API Response Time Under Stress
**Area:** Performance  
**Preconditions:** 
- High load scenario

**Steps:**
1. Apply stress load (200 req/sec)
2. Measure API response times
3. Verify SLA compliance

**Expected Result:**
- 95th percentile response time < 2 seconds
- No timeouts
- Graceful degradation under extreme load
- Rate limiting prevents overload
- System remains responsive

**Severity if Fails:** Medium

---

### TC-PERF-006: Rate Limiter Behavior Under Burst Traffic
**Area:** Performance / Security  
**Preconditions:** 
- Rate limiter active
- Burst traffic scenario

**Steps:**
1. Send burst of 200 requests in 1 second
2. Observe rate limiter behavior
3. Verify legitimate requests not blocked

**Expected Result:**
- Rate limiter handles burst correctly
- Legitimate requests processed
- Excess requests rate-limited (429)
- No server overload
- System stability maintained

**Severity if Fails:** High

---

## 12. Regression Tests

### TC-REG-001: Old Tokens Rejected
**Area:** Regression / Security  
**Preconditions:** 
- Security fixes applied
- Old token format exists

**Steps:**
1. Use old token format (if any exist)
2. Attempt API request
3. Verify rejection

**Expected Result:**
- Old tokens rejected
- Returns 401 "Invalid or expired token"
- New token format required
- Security fixes active
- Backward compatibility handled

**Severity if Fails:** High

---

### TC-REG-002: Old Sessions Invalidated
**Area:** Regression / Security  
**Preconditions:** 
- Security fixes applied
- Old session mechanism

**Steps:**
1. Attempt to use old session format
2. Verify invalidation

**Expected Result:**
- Old sessions not recognized
- New authentication required
- Security improvements active
- Migration handled

**Severity if Fails:** Medium

---

### TC-REG-003: Re-Login Required
**Area:** Regression  
**Preconditions:** 
- Security fixes applied
- Existing users

**Steps:**
1. Attempt to use old authentication
2. Verify re-login required

**Expected Result:**
- Old authentication fails
- Users must re-login
- New token system works
- Migration path clear

**Severity if Fails:** Low

---

### TC-REG-004: Existing User Data Intact
**Area:** Regression  
**Preconditions:** 
- Security fixes applied
- Existing user data in database

**Steps:**
1. Login with existing user
2. Verify user data accessible
3. Verify schedules intact

**Expected Result:**
- User data preserved
- Schedules accessible
- No data loss
- Migration successful
- Functionality maintained

**Severity if Fails:** Critical

---

### TC-REG-005: No Broken Student Flows
**Area:** Regression  
**Preconditions:** 
- Security fixes applied
- Student functionality

**Steps:**
1. Login as student
2. Navigate student pages
3. Generate schedules
4. View schedules
5. Export PDFs

**Expected Result:**
- All student flows work
- No broken functionality
- UI renders correctly
- API calls succeed
- User experience maintained

**Severity if Fails:** Critical

---

### TC-REG-006: No Broken Admin Flows
**Area:** Regression  
**Preconditions:** 
- Security fixes applied
- Admin functionality

**Steps:**
1. Login as admin
2. Navigate admin pages
3. Create/manage resources
4. Perform admin actions

**Expected Result:**
- All admin flows work
- No broken functionality
- CRUD operations succeed
- UI renders correctly
- Admin capabilities maintained

**Severity if Fails:** Critical

---

### TC-REG-007: No UI Regressions
**Area:** Regression  
**Preconditions:** 
- Security fixes applied
- UI components

**Steps:**
1. Navigate all pages
2. Verify UI rendering
3. Check for visual bugs
4. Test responsive design

**Expected Result:**
- UI renders correctly
- No visual regressions
- Responsive design intact
- Animations work
- User experience maintained

**Severity if Fails:** Low

---

## 13. Environment & Configuration

### TC-ENV-001: Missing Env Variables → App Fails Safely
**Area:** Configuration / Security  
**Preconditions:** 
- Environment variables required
- Missing `JWT_SECRET`

**Steps:**
1. Remove `JWT_SECRET` from environment
2. Start backend server
3. Observe behavior

**Expected Result:**
- Server fails to start
- Error: "JWT_SECRET environment variable must be set..."
- No default/weak secret used
- Application does not start with insecure config
- Security enforced

**Severity if Fails:** Critical

---

### TC-ENV-002: Weak Secrets Rejected
**Area:** Configuration / Security  
**Preconditions:** 
- Environment variable validation

**Steps:**
1. Set `JWT_SECRET` to "123" (too short)
2. Start backend server
3. Observe behavior

**Expected Result:**
- Server fails to start
- Error: "JWT_SECRET must be at least 32 characters"
- Weak secrets rejected
- Minimum length enforced
- Security requirements met

**Severity if Fails:** Critical

---

### TC-ENV-003: Dev Config Not Active in Prod
**Area:** Configuration / Security  
**Preconditions:** 
- Production environment
- `NODE_ENV=production`

**Steps:**
1. Set `NODE_ENV=production`
2. Start server
3. Verify production configs active

**Expected Result:**
- Debug mode disabled
- Stack traces not exposed
- CORS strict (only allowed origins)
- Secure cookies enabled
- Production security active

**Severity if Fails:** Critical

---

### TC-ENV-004: HTTPS Enforced
**Area:** Configuration / Security  
**Preconditions:** 
- Production environment
- HTTPS available

**Steps:**
1. Deploy to production
2. Verify HTTPS configuration
3. Attempt HTTP access

**Expected Result:**
- HTTPS enforced
- HTTP redirects to HTTPS
- Secure cookies require HTTPS
- HSTS header present
- Security maintained

**Severity if Fails:** Critical

---

### TC-ENV-005: Security Headers Present
**Area:** Configuration / Security  
**Preconditions:** 
- Application running
- Production environment

**Steps:**
1. Make HTTP request
2. Check response headers
3. Verify security headers

**Expected Result:**
- `Content-Security-Policy` header present
- `X-Content-Type-Options: nosniff` present
- `X-Frame-Options: DENY` present
- `X-XSS-Protection: 1; mode=block` present
- `Strict-Transport-Security` present (HTTPS)
- `Referrer-Policy` present
- All security headers configured

**Severity if Fails:** High

---

## Summary Tables

### Test Cases by Category

| Category | Total Test Cases | Critical | High | Medium | Low |
|----------|-----------------|----------|------|--------|-----|
| Authentication | 19 | 7 | 8 | 3 | 1 |
| Authorization | 14 | 10 | 3 | 1 | 0 |
| Admin Panel | 7 | 4 | 2 | 1 | 0 |
| Timetable Generation | 14 | 3 | 5 | 6 | 0 |
| Schedule Viewing | 8 | 4 | 2 | 2 | 0 |
| PDF Export | 17 | 2 | 4 | 4 | 7 |
| Frontend Security | 7 | 3 | 2 | 2 | 0 |
| API Security | 12 | 7 | 4 | 1 | 0 |
| CSRF Protection | 5 | 5 | 0 | 0 | 0 |
| Error Handling | 6 | 1 | 4 | 1 | 0 |
| Performance | 6 | 0 | 4 | 2 | 0 |
| Regression | 7 | 3 | 1 | 0 | 3 |
| Environment | 5 | 4 | 1 | 0 | 0 |
| **TOTAL** | **126** | **53** | **40** | **23** | **10** |

### Risk Assessment by Category

| Category | Risk if Fails | Impact | Likelihood | Mitigation |
|----------|---------------|--------|------------|------------|
| Authentication | **CRITICAL** | Complete system compromise | High | Server-side validation, strong secrets |
| Authorization | **CRITICAL** | Unauthorized access, data breach | High | Database role verification |
| Admin Panel | **CRITICAL** | Admin functionality exposed | Medium | Server-side route protection |
| Timetable Generation | **HIGH** | Invalid data, system instability | Medium | Input validation, business logic checks |
| Schedule Viewing | **HIGH** | Data leakage, privacy violation | Medium | IDOR protection, resource ownership |
| PDF Export | **MEDIUM** | Data exposure, unauthorized export | Low | Authorization checks |
| Frontend Security | **HIGH** | XSS attacks, token theft | Medium | CSP, input sanitization |
| API Security | **CRITICAL** | API abuse, injection attacks | High | Input validation, rate limiting |
| CSRF Protection | **CRITICAL** | Unauthorized actions | Medium | CSRF tokens, SameSite cookies |
| Error Handling | **HIGH** | Information disclosure | Medium | Generic errors, no stack traces |
| Performance | **MEDIUM** | Service unavailability | Low | Rate limiting, resource management |
| Regression | **HIGH** | Broken functionality | Low | Comprehensive testing |
| Environment | **CRITICAL** | Insecure deployment | Low | Environment validation |

---

## GO / NO-GO Deployment Checklist

### Critical Requirements (MUST PASS)

- [ ] **TC-AUTH-001**: Valid credentials login works
- [ ] **TC-AUTH-004**: Rate limiting prevents brute force
- [ ] **TC-AUTH-015**: Refresh token not accessible via JavaScript
- [ ] **TC-AUTH-017**: Cookies are httpOnly + Secure
- [ ] **TC-AUTHZ-002**: Students cannot access admin routes
- [ ] **TC-AUTHZ-003**: Students cannot call admin APIs
- [ ] **TC-AUTHZ-011**: JWT payload modification fails
- [ ] **TC-AUTHZ-012**: Database role verification prevents escalation
- [ ] **TC-ADMIN-001**: Admin UI server-side protection active
- [ ] **TC-ADMIN-002**: Admin routes require authentication
- [ ] **TC-API-001**: Missing auth header returns 401
- [ ] **TC-API-004**: Modified token signature rejected
- [ ] **TC-API-005**: SQL injection prevented
- [ ] **TC-API-010**: Rate limiting enforced
- [ ] **TC-API-011**: CORS origin abuse prevented
- [ ] **TC-CSRF-001**: POST from external origin blocked
- [ ] **TC-CSRF-002**: Form without CSRF token rejected
- [ ] **TC-ERROR-003**: No stack traces in production
- [ ] **TC-ENV-001**: Missing env variables cause safe failure
- [ ] **TC-ENV-002**: Weak secrets rejected
- [ ] **TC-ENV-003**: Dev config not active in prod
- [ ] **TC-ENV-005**: Security headers present

### High Priority Requirements (SHOULD PASS)

- [ ] **TC-AUTH-002**: Invalid credentials handled correctly
- [ ] **TC-AUTH-007**: Logout invalidates session
- [ ] **TC-AUTH-008**: Token expiry works (15 min)
- [ ] **TC-AUTH-009**: Auto refresh token success
- [ ] **TC-AUTHZ-004**: IDOR protection active
- [ ] **TC-AUTHZ-006**: Unpublished terms protected
- [ ] **TC-ADMIN-003**: Expired token access blocked
- [ ] **TC-ADMIN-004**: Student token access blocked
- [ ] **TC-TIMETABLE-001**: Schedule generation works
- [ ] **TC-TIMETABLE-009**: Conflict detection works
- [ ] **TC-TIMETABLE-010**: Capacity limits enforced
- [ ] **TC-VIEW-002**: Cannot view others' schedules
- [ ] **TC-VIEW-003**: URL manipulation prevented
- [ ] **TC-PDF-014**: Cannot export others' schedules
- [ ] **TC-PDF-016**: Export API requires authentication
- [ ] **TC-FRONTEND-005**: XSS injection prevented
- [ ] **TC-FRONTEND-006**: CSP enforcement active
- [ ] **TC-API-003**: Expired token rejected
- [ ] **TC-API-007**: Long input strings rejected
- [ ] **TC-ERROR-001**: 401 vs 403 correctness
- [ ] **TC-ERROR-002**: Generic error messages
- [ ] **TC-PERF-001**: Concurrent users handled
- [ ] **TC-PERF-002**: Concurrent generation works
- [ ] **TC-REG-004**: Existing user data intact
- [ ] **TC-REG-005**: Student flows work
- [ ] **TC-REG-006**: Admin flows work

### Medium Priority Requirements (NICE TO HAVE)

- [ ] **TC-AUTH-011**: Refresh token reuse prevention
- [ ] **TC-AUTH-012**: Old token behavior documented
- [ ] **TC-TIMETABLE-005**: Empty course selection validation
- [ ] **TC-TIMETABLE-006**: Duplicate course handling
- [ ] **TC-TIMETABLE-011**: Prerequisite validation
- [ ] **TC-TIMETABLE-012**: Excessive courses limit
- [ ] **TC-TIMETABLE-013**: Large payload handling
- [ ] **TC-VIEW-004**: Unpublished terms protected
- [ ] **TC-VIEW-007**: Pagination boundaries
- [ ] **TC-PDF-003**: Empty schedule export
- [ ] **TC-PDF-004**: Large schedule export
- [ ] **TC-PDF-005**: Export after token refresh
- [ ] **TC-FRONTEND-001**: DevTools tampering (expected)
- [ ] **TC-FRONTEND-002**: Request payload modification
- [ ] **TC-API-008**: Malformed JSON handling
- [ ] **TC-API-009**: Unexpected data types
- [ ] **TC-ERROR-004**: Consistent error format
- [ ] **TC-PERF-003**: Rapid refresh token usage
- [ ] **TC-PERF-005**: API response time under stress

### Deployment Decision Matrix

| Critical Failures | High Failures | Medium Failures | Decision |
|-------------------|---------------|-----------------|----------|
| 0 | 0-2 | Any | ✅ **GO** - Deploy to production |
| 0 | 3-5 | Any | ⚠️ **CONDITIONAL GO** - Fix high priority, then deploy |
| 1+ | Any | Any | ❌ **NO-GO** - Fix critical issues first |
| 0 | 6+ | Any | ❌ **NO-GO** - Too many high priority issues |

---

## Final Recommendations

### Before Production Deployment

1. **Execute all Critical test cases** - All 53 critical tests must pass
2. **Execute all High priority test cases** - At least 38/40 should pass
3. **Security audit** - Verify all security fixes from `SECURITY_FIXES_APPLIED.md` are active
4. **Performance testing** - Load test with expected production traffic
5. **Environment validation** - Verify all environment variables set correctly
6. **Monitoring setup** - Configure logging and monitoring for production
7. **Backup strategy** - Ensure database backups configured
8. **Documentation** - Update deployment docs with test results

### Known Limitations (Document These)

1. **Stateless JWT tokens** - Old access tokens cannot be invalidated server-side until natural expiry (15 min). Consider token blacklist for production.
2. **Client-side PDF generation** - PDFs generated client-side mean data is already in browser. This is acceptable but should be documented.
3. **Rate limiting in memory** - Current rate limiter uses in-memory store. For distributed systems, consider Redis-based rate limiting.

### Post-Deployment Monitoring

1. Monitor authentication failures (potential attacks)
2. Monitor rate limit hits (potential abuse)
3. Monitor error rates (system health)
4. Monitor API response times (performance)
5. Monitor token refresh frequency (session health)

---

## Test Execution Log Template

```
Test Suite Execution Log
Date: ___________
Tester: ___________
Environment: ___________

Category: Authentication
- TC-AUTH-001: [ ] PASS [ ] FAIL [ ] SKIP
- TC-AUTH-002: [ ] PASS [ ] FAIL [ ] SKIP
...

Category: Authorization
- TC-AUTHZ-001: [ ] PASS [ ] FAIL [ ] SKIP
...

[Continue for all categories]

Summary:
- Total Tests: _____
- Passed: _____
- Failed: _____
- Skipped: _____
- Critical Failures: _____
- High Priority Failures: _____

Decision: [ ] GO [ ] NO-GO [ ] CONDITIONAL GO

Notes:
_________________________________________________
_________________________________________________
```

---

**END OF TEST SUITE**

This comprehensive test suite covers all critical aspects of the Timetable Management System. Execute these tests thoroughly before production deployment to ensure security, stability, and functionality.
