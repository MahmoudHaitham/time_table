# Automated Test Suite

This directory contains automated tests for the Timetable Management System.

## Setup

```bash
cd tests
npm install
```

## Configuration

Set environment variables in `.env` file:

```env
API_BASE_URL=http://localhost:5000/api
FRONTEND_URL=http://localhost:3000
TEST_ADMIN_REG=admin001
TEST_ADMIN_PASS=TestAdmin123!
TEST_STUDENT_REG=student001
TEST_STUDENT_PASS=TestStudent123!
TEST_TERM_ID=1
TEST_SYSTEM_TYPE=140
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Suites
```bash
# Authentication tests
npm run test:auth

# API Security tests
npm run test:api

# Performance tests
npm run test:performance
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
npm run test:e2e:ui  # With UI
```

### Load Testing
```bash
npm run load-test
```

### Security Scan
```bash
npm run security-scan
```

## Test Coverage

### Automated (✅)
- ✅ Authentication (TC-AUTH-001 to TC-AUTH-019)
- ✅ Authorization (TC-AUTHZ-001 to TC-AUTHZ-014)
- ✅ API Security (TC-API-001 to TC-API-012)
- ✅ CSRF Protection (TC-CSRF-001 to TC-CSRF-005)
- ✅ Error Handling (TC-ERROR-001 to TC-ERROR-006)
- ✅ Performance (TC-PERF-001 to TC-PERF-006)
- ✅ Security Headers
- ✅ CORS Configuration

### Manual Verification Required (⚠️)
- ⚠️ Visual/UI Tests (PDF appearance, colors, layout)
- ⚠️ DevTools Tampering (partial automation possible)
- ⚠️ Visual Regression Tests
- ⚠️ User Experience Flows (can use E2E tools)

## Test Structure

```
tests/
├── auth.test.ts              # Authentication tests
├── authorization.test.ts      # Authorization tests
├── api-security.test.ts       # API security tests
├── csrf.test.ts              # CSRF protection tests
├── error-handling.test.ts    # Error handling tests
├── performance.test.ts       # Performance tests
├── config.ts                 # Test configuration
├── utils/
│   └── api-client.ts        # API client utility
├── load/
│   └── load-test.yml        # Artillery load test config
└── security/
    └── security-scan.js     # Security header scanner
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd tests && npm install
      - run: cd tests && npm test
      - run: cd tests && npm run security-scan
```

## Notes

- Tests require backend server running on `http://localhost:5000`
- Tests require test users in database (admin001, student001)
- Some tests may require manual setup (test data, etc.)
- Performance tests may take longer to complete
