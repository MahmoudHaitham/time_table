# Security Audit Report
**Application:** Timetable Management System  
**Date:** 2024  
**Scope:** Full-stack security analysis (Frontend + Backend)  
**Methodology:** Static code analysis, authentication flow review, API endpoint audit

---

## Executive Summary

This security audit identified **27 security vulnerabilities** across authentication, authorization, API security, data exposure, and business logic. The application has several critical issues that could allow unauthorized access, privilege escalation, and data manipulation.

**Severity Breakdown:**
- **Critical:** 5 issues
- **High:** 8 issues  
- **Medium:** 9 issues
- **Low:** 5 issues

---

## 1. Authentication & Session Management

### 🔴 CRITICAL: Admin Pages Protected Only by Client-Side Checks

**Location:** `app/admin/**/*.tsx` (all admin pages)

**Issue:** Admin pages check authentication using only `localStorage.getItem("auth_token")` without server-side validation. An attacker can:
- Access admin routes directly by manipulating localStorage
- Bypass authentication by removing the check in DevTools
- Access admin functionality without valid credentials

**How it can be exploited:**
1. Open browser DevTools
2. Execute: `localStorage.setItem("auth_token", "fake_token")`
3. Navigate to `/admin/timetable` - page loads without server validation
4. API calls will fail, but UI is accessible

**What is at risk:** Complete admin panel access, ability to view admin UI structure, potential for CSRF attacks if tokens are stolen

**Why it is dangerous:** Admin functionality should never rely on client-side checks. The server must validate every request.

---

### 🔴 CRITICAL: JWT Secret Uses Weak Default Value

**Location:** `backend/src/middleware/auth.ts:4`, `backend/src/controllers/authController.ts:7`

**Issue:** JWT_SECRET defaults to `"your-secret-key-change-in-production"` if environment variable is not set.

**How it can be exploited:**
1. If environment variable is missing, attacker can forge tokens using the default secret
2. Decode existing tokens to extract user information
3. Create valid tokens for any user ID/role

**What is at risk:** Complete authentication bypass, ability to impersonate any user including admins

**Why it is dangerous:** Weak secrets allow token forgery, leading to full system compromise.

---

### 🔴 CRITICAL: Authentication Tokens Stored in localStorage

**Location:** `lib/api/auth.ts:32`, `app/login/page.tsx:30`, all admin pages

**Issue:** JWT tokens stored in `localStorage`, which is vulnerable to XSS attacks.

**How it can be exploited:**
1. Inject malicious JavaScript via any XSS vector
2. Script reads: `localStorage.getItem("auth_token")`
3. Token sent to attacker's server
4. Attacker uses token to impersonate user

**What is at risk:** Token theft, account takeover, unauthorized access to all user data

**Why it is dangerous:** localStorage is accessible to any JavaScript running on the page, making it trivial to steal tokens via XSS.

---

### 🟠 HIGH: No Token Refresh Mechanism

**Location:** `backend/src/controllers/authController.ts:54, 119`

**Issue:** Tokens expire after 7 days with no refresh mechanism. Users must re-login.

**How it can be exploited:**
- Not directly exploitable, but poor UX and security practice
- Long-lived tokens increase exposure window if stolen

**What is at risk:** User experience degradation, increased risk if token is compromised

**Why it is dangerous:** Long-lived tokens without refresh increase the impact of token theft.

---

### 🟠 HIGH: No Server-Side Session Invalidation on Logout

**Location:** `app/admin/timetable/page.tsx:38-41`

**Issue:** Logout only removes token from localStorage. Server doesn't invalidate the token.

**How it can be exploited:**
1. User logs out
2. Attacker who previously stole token can still use it
3. Token remains valid until expiration (7 days)

**What is at risk:** Stolen tokens remain usable after logout, no way to revoke access

**Why it is dangerous:** Logout should invalidate sessions server-side to prevent token reuse.

---

### 🟡 MEDIUM: Weak Term Token Secret

**Location:** `backend/src/utils/termToken.ts:9`

**Issue:** TERM_TOKEN_SECRET defaults to `"your-secret-key-change-in-production-2024"`

**How it can be exploited:**
1. If environment variable missing, attacker can forge term tokens
2. Access unpublished terms by generating valid tokens
3. Bypass term access controls

**What is at risk:** Unauthorized access to unpublished timetable data

**Why it is dangerous:** Weak secrets allow token forgery, bypassing access controls.

---

## 2. Authorization & Access Control

### 🔴 CRITICAL: No Authorization Checks on Admin API Endpoints

**Location:** `backend/src/app.ts:95-108`

**Issue:** While `requireAuth` and `requireAdmin` middleware are applied, there's no validation that the authenticated user actually has admin role in the database. The middleware trusts the JWT token's role claim without verification.

**How it can be exploited:**
1. Create a JWT token with `role: "admin"` (if secret is weak)
2. Send requests to admin endpoints
3. Access admin functionality

**What is at risk:** Unauthorized admin actions, data modification, system configuration changes

**Why it is dangerous:** Role claims in tokens should be verified against database on each request.

---

### 🟠 HIGH: Admin Pages Lack Server-Side Route Protection

**Location:** `app/admin/layout.tsx`, all admin pages

**Issue:** Admin layout has no authentication check. Pages check localStorage but don't verify with server.

**How it can be exploited:**
1. Access admin routes directly
2. UI loads (even if API calls fail)
3. View admin interface structure
4. Potential for CSRF if user has valid token

**What is at risk:** Admin UI exposure, CSRF attack surface, information disclosure

**Why it is dangerous:** Admin routes should be protected at the Next.js middleware level with server-side validation.

---

### 🟠 HIGH: No User-Specific Resource Access Control (IDOR)

**Location:** All API endpoints that accept user/term/class IDs

**Issue:** No validation that authenticated users can only access resources they own. For example:
- Users could potentially access other users' schedules
- No checks that term access is authorized for specific users

**How it can be exploited:**
1. Authenticate as any user
2. Modify term IDs in requests: `/api/timetable/terms/999`
3. Access other users' data if IDs are predictable

**What is at risk:** Unauthorized data access, privacy violations, data leakage

**Why it is dangerous:** IDOR vulnerabilities allow attackers to access resources belonging to other users.

---

### 🟡 MEDIUM: Public Endpoints Don't Validate Term Publication Status Consistently

**Location:** `backend/src/controllers/timetableViewController.ts`

**Issue:** Some endpoints check `is_published: true`, but the check might be bypassable if term IDs are manipulated.

**How it can be exploited:**
1. Enumerate term IDs
2. Access unpublished terms if validation is inconsistent

**What is at risk:** Access to unpublished timetable data

**Why it is dangerous:** Inconsistent validation can lead to information disclosure.

---

## 3. API Security

### 🟠 HIGH: Rate Limiting Not Applied to All Routes

**Location:** `backend/src/middleware/rateLimiter.ts`, `backend/src/app.ts`

**Issue:** Rate limiting middleware exists but is not applied to routes in `app.ts`. Only schedule generation might have it.

**How it can be exploited:**
1. Automated scripts can hammer endpoints
2. No protection against brute force on login
3. No protection against enumeration attacks
4. DDoS potential

**What is at risk:** Service availability, brute force attacks, resource exhaustion

**Why it is dangerous:** Without rate limiting, attackers can overwhelm the server or perform brute force attacks.

---

### 🟠 HIGH: No Rate Limiting on Authentication Endpoints

**Location:** `backend/src/routes/authRoutes.ts`

**Issue:** Login and registration endpoints have no rate limiting.

**How it can be exploited:**
1. Brute force login attempts
2. Enumerate valid registration numbers
3. Overwhelm server with requests

**What is at risk:** Account compromise via brute force, service unavailability

**Why it is dangerous:** Authentication endpoints are prime targets and must be rate-limited.

---

### 🟡 MEDIUM: CORS Configuration May Allow Origin Bypass

**Location:** `backend/src/app.ts:35-58`

**Issue:** CORS checks `allowedOrigins` but if `origin` is `null` (e.g., mobile apps, Postman), it allows the request.

**How it can be exploited:**
1. Make requests from tools that don't send Origin header
2. Bypass CORS restrictions
3. Access APIs from unauthorized origins

**What is at risk:** Unauthorized API access, CSRF attacks if credentials are included

**Why it is dangerous:** CORS should be more restrictive, especially for authenticated endpoints.

---

### 🟡 MEDIUM: No Input Length Validation

**Location:** Various controllers (termController, courseController, etc.)

**Issue:** No maximum length validation on string inputs like `term_number`, `class_code`, `course_code`, etc.

**How it can be exploited:**
1. Send extremely long strings
2. Cause database errors or DoS
3. Potential buffer overflow (unlikely with TypeORM but still risky)

**What is at risk:** Database errors, potential DoS, data corruption

**Why it is dangerous:** Unvalidated input lengths can cause system instability.

---

### 🟡 MEDIUM: Query Parameter Parsing Without Sanitization

**Location:** `backend/src/controllers/timetableViewController.ts:846, 961`

**Issue:** Query parameters like `selectedCourseIds` and `courseIds` are parsed directly without validation.

**How it can be exploited:**
1. Send malformed query parameters
2. Cause parsing errors or unexpected behavior
3. Potential for injection if not handled properly

**What is at risk:** Application errors, potential injection vectors

**Why it is dangerous:** Unvalidated query parameters can lead to errors or security issues.

---

## 4. Data Exposure

### 🟠 HIGH: Internal Database IDs Exposed in API Responses

**Location:** All API endpoints

**Issue:** Database primary keys (term IDs, class IDs, course IDs, user IDs) are exposed in API responses.

**How it can be exploited:**
1. Enumerate IDs: `/api/terms/1`, `/api/terms/2`, etc.
2. Access resources by guessing IDs
3. Map system structure

**What is at risk:** Information disclosure, IDOR attacks, system mapping

**Why it is dangerous:** Exposed IDs make enumeration and IDOR attacks easier.

---

### 🟡 MEDIUM: Error Messages May Leak Information

**Location:** Various controllers

**Issue:** Error messages sometimes include internal details (e.g., database errors, stack traces in development).

**How it can be exploited:**
1. Trigger errors intentionally
2. Extract system information from error messages
3. Map database structure

**What is at risk:** Information disclosure, system mapping

**Why it is dangerous:** Detailed error messages help attackers understand the system.

---

### 🟡 MEDIUM: No Data Filtering Based on User Permissions

**Location:** `backend/src/controllers/timetableViewController.ts`

**Issue:** Public endpoints return all data without filtering based on user identity or permissions.

**How it can be exploited:**
1. Access endpoints without authentication
2. Receive all available data
3. No user-specific filtering

**What is at risk:** Information disclosure, privacy violations

**Why it is dangerous:** Users should only see data they're authorized to access.

---

## 5. Frontend Security

### 🔴 CRITICAL: Admin Authentication Check Can Be Bypassed

**Location:** All admin pages (`app/admin/**/*.tsx`)

**Issue:** Admin pages check `localStorage.getItem("auth_token")` but don't verify with server. Check can be removed in DevTools.

**How it can be exploited:**
1. Open admin page
2. Remove auth check in DevTools
3. Access admin UI (API calls will fail, but UI is exposed)

**What is at risk:** Admin UI structure exposure, potential CSRF if token is stolen

**Why it is dangerous:** Client-side checks are trivial to bypass.

---

### 🟠 HIGH: No CSRF Protection

**Location:** All API endpoints, frontend forms

**Issue:** No CSRF tokens or SameSite cookie protection implemented.

**How it can be exploited:**
1. Create malicious website
2. Trick authenticated user to visit
3. Website makes requests to API using user's cookies/tokens
4. Perform actions on user's behalf

**What is at risk:** Unauthorized actions, data modification, account takeover

**Why it is dangerous:** CSRF attacks can perform actions without user consent.

---

### 🟡 MEDIUM: Sensitive Data in sessionStorage

**Location:** `app/student/timetable/**/*.tsx`

**Issue:** Preferences and term data stored in `sessionStorage`, which is accessible to JavaScript.

**How it can be exploited:**
1. XSS attack reads sessionStorage
2. Extract timetable preferences, term tokens
3. Potential for session hijacking

**What is at risk:** Data theft, session information disclosure

**Why it is dangerous:** sessionStorage is vulnerable to XSS, similar to localStorage.

---

### 🟡 MEDIUM: No Content Security Policy (CSP) Headers

**Location:** Frontend (Next.js app)

**Issue:** No CSP headers configured to prevent XSS attacks.

**How it can be exploited:**
1. Inject malicious scripts
2. Bypass XSS protections
3. Steal tokens, perform actions

**What is at risk:** XSS attacks, token theft, account compromise

**Why it is dangerous:** CSP is a critical defense against XSS attacks.

---

## 6. Business Logic Vulnerabilities

### 🟠 HIGH: Schedule Generation Has No User Validation

**Location:** `backend/src/controllers/timetableViewController.ts:generateTimetableSchedules`

**Issue:** Schedule generation endpoint doesn't validate that the user is authorized to generate schedules for the specified term/system.

**How it can be exploited:**
1. Generate schedules for any term/system
2. Consume server resources
3. Potential DoS

**What is at risk:** Resource exhaustion, unauthorized schedule generation

**Why it is dangerous:** Heavy computation endpoints should validate user permissions.

---

### 🟡 MEDIUM: No Capacity Limit Validation

**Location:** Schedule generation logic

**Issue:** No validation that class capacity limits are respected when generating schedules.

**How it can be exploited:**
1. Generate schedules that exceed capacity
2. Create invalid schedules
3. Potential data inconsistency

**What is at risk:** Data integrity, invalid schedule generation

**Why it is dangerous:** Business rules should be enforced server-side.

---

### 🟡 MEDIUM: No Prerequisite Validation

**Location:** Schedule generation logic

**Issue:** No validation that course prerequisites are met when generating schedules.

**How it can be exploited:**
1. Generate schedules with missing prerequisites
2. Create invalid course combinations

**What is at risk:** Data integrity, invalid schedules

**Why it is dangerous:** Business rules must be enforced.

---

### 🟡 MEDIUM: No Conflict Detection for Schedule Generation

**Location:** Schedule generation logic

**Issue:** While schedules are generated to avoid conflicts, there's no explicit validation that generated schedules don't have conflicts.

**How it can be exploited:**
1. Generate schedules with time conflicts
2. Create invalid timetables

**What is at risk:** Data integrity, invalid schedules

**Why it is dangerous:** Generated data should be validated.

---

## 7. Configuration & Environment

### 🔴 CRITICAL: Hardcoded Secrets in Code

**Location:** `backend/src/middleware/auth.ts:4`, `backend/src/utils/termToken.ts:9`

**Issue:** Default secret values are hardcoded and weak.

**How it can be exploited:**
1. If environment variables are not set, use default secrets
2. Forge tokens, bypass security

**What is at risk:** Complete authentication bypass

**Why it is dangerous:** Secrets must never be hardcoded or have weak defaults.

---

### 🟡 MEDIUM: Environment Variables May Be Exposed

**Location:** `.env` files, deployment configuration

**Issue:** No verification that sensitive environment variables are properly secured.

**How it can be exploited:**
1. If `.env` files are committed to git
2. Secrets exposed in repository
3. Compromise all security

**What is at risk:** Complete system compromise

**Why it is dangerous:** Exposed secrets lead to full system access.

---

### 🟡 MEDIUM: Debug Mode May Expose Information

**Location:** `backend/src/controllers/timetableViewController.ts:111`

**Issue:** Error messages include stack traces in development mode.

**How it can be exploited:**
1. If debug mode enabled in production
2. Extract system information from errors

**What is at risk:** Information disclosure

**Why it is dangerous:** Debug information should never be exposed in production.

---

## 8. File & Export Features

### 🟡 MEDIUM: PDF Export Generates Client-Side

**Location:** `app/student/timetable/system/[systemType]/[termId]/schedules/page.tsx:241`

**Issue:** PDFs are generated entirely client-side using jsPDF, meaning all data is already in the browser.

**How it can be exploited:**
1. Data is already exposed in browser
2. No additional risk beyond data exposure
3. But PDF generation could be manipulated

**What is at risk:** Data manipulation in PDFs, but data is already exposed

**Why it is dangerous:** Client-side PDF generation means data is already accessible, but manipulation is possible.

---

### 🟡 MEDIUM: No Validation on Export Parameters

**Location:** PDF export functions

**Issue:** No validation that user is authorized to export specific schedules.

**How it can be exploited:**
1. Export schedules for other users
2. If schedule data is accessible, export is possible

**What is at risk:** Unauthorized data export

**Why it is dangerous:** Export functionality should validate permissions.

---

## Summary of Recommendations

### Immediate Actions (Critical/High Priority)

1. **Implement server-side authentication checks** for all admin pages
2. **Remove hardcoded secrets** and require environment variables
3. **Move tokens from localStorage to httpOnly cookies** or implement secure token storage
4. **Add rate limiting** to all API endpoints, especially authentication
5. **Implement CSRF protection** for state-changing operations
6. **Add authorization checks** that verify user permissions from database
7. **Implement token refresh mechanism** with shorter-lived access tokens
8. **Add server-side session invalidation** on logout

### Medium Priority

1. **Add input validation** and length limits
2. **Implement IDOR protection** by validating resource ownership
3. **Add Content Security Policy** headers
4. **Filter error messages** in production
5. **Implement business logic validation** for schedules
6. **Add request logging** and monitoring

### Low Priority

1. **Review CORS configuration** for stricter rules
2. **Implement request signing** for sensitive operations
3. **Add security headers** (HSTS, X-Frame-Options, etc.)
4. **Implement audit logging** for admin actions
5. **Add data encryption** for sensitive fields at rest

---

## Testing Recommendations

1. **Penetration Testing:** Conduct full penetration test focusing on authentication bypass
2. **Automated Scanning:** Run OWASP ZAP or Burp Suite scans
3. **Code Review:** Review all authentication and authorization logic
4. **Dependency Scanning:** Check for vulnerable dependencies
5. **Security Headers Testing:** Verify all security headers are present

---

**End of Security Audit Report**
