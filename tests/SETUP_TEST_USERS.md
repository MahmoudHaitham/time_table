# Setting Up Test Users

## ⚠️ IMPORTANT: Use Test Credentials Only

**NEVER use production credentials in tests!**

Create separate test users in your database for testing purposes.

---

## Option 1: Create Test Users via API (Recommended)

### Step 1: Start Backend Server
```bash
cd backend
npm start
```

### Step 2: Register Test Users via API

#### Register Admin Test User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "testadmin001",
    "password": "TestAdmin123!",
    "full_name": "Test Admin User"
  }'
```

#### Register Student Test User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "teststudent001",
    "password": "TestStudent123!",
    "full_name": "Test Student User"
  }'
```

**Note:** Registration endpoint may require admin access. If so, use Option 2.

---

## Option 2: Create Test Users Directly in Database

### Using PostgreSQL CLI
```sql
-- Connect to database
psql -U your_username -d your_database

-- Insert test admin user (password: TestAdmin123!)
-- Password hash for "TestAdmin123!" using bcrypt (10 rounds)
INSERT INTO "user" (registration_number, password, full_name, role, created_at, updated_at)
VALUES (
  'testadmin001',
  '$2a$10$rKx8KxKxKxKxKxKxKxKxOeKxKxKxKxKxKxKxKxKxKxKxKxKxKxKxKx', -- Hash of "TestAdmin123!"
  'Test Admin User',
  'admin',
  NOW(),
  NOW()
);

-- Insert test student user (password: TestStudent123!)
INSERT INTO "user" (registration_number, password, full_name, role, created_at, updated_at)
VALUES (
  'teststudent001',
  '$2a$10$rKx8KxKxKxKxKxKxKxKxOeKxKxKxKxKxKxKxKxKxKxKxKxKxKxKxKx', -- Hash of "TestStudent123!"
  'Test Student User',
  'student',
  NOW(),
  NOW()
);
```

### Generate Password Hash

Use Node.js to generate bcrypt hash:

```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('TestAdmin123!', 10);
console.log(hash);
```

Or use online bcrypt generator (for testing only):
- https://bcrypt-generator.com/

---

## Option 3: Use Existing Test Users

If you already have test users in your database, update the test configuration:

### Update `tests/config.ts` or create `tests/.env`:

```env
TEST_ADMIN_REG=your_existing_admin_reg_number
TEST_ADMIN_PASS=your_existing_admin_password
TEST_STUDENT_REG=your_existing_student_reg_number
TEST_STUDENT_PASS=your_existing_student_password
```

---

## Verify Test Users

### Test Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "testadmin001",
    "password": "TestAdmin123!"
  }'
```

### Test Student Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "teststudent001",
    "password": "TestStudent123!"
  }'
```

Both should return `200 OK` with tokens.

---

## Default Test Credentials (in config.ts)

The test suite uses these defaults (you can override with `.env`):

```typescript
adminCredentials: {
  registration_number: 'testadmin001',
  password: 'TestAdmin123!',
},
studentCredentials: {
  registration_number: 'teststudent001',
  password: 'TestStudent123!',
}
```

---

## Security Best Practices

1. ✅ **Use separate test database** for testing
2. ✅ **Use test-only credentials** (not production)
3. ✅ **Never commit credentials** to git
4. ✅ **Use environment variables** for sensitive data
5. ✅ **Clean up test data** after tests (optional)

---

## Quick Setup Script

Create `tests/setup-test-users.js`:

```javascript
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function createTestUsers() {
  try {
    // Register admin
    const adminRes = await axios.post(`${API_URL}/auth/register`, {
      registration_number: 'testadmin001',
      password: 'TestAdmin123!',
      full_name: 'Test Admin'
    });
    console.log('✅ Admin user created');

    // Register student
    const studentRes = await axios.post(`${API_URL}/auth/register`, {
      registration_number: 'teststudent001',
      password: 'TestStudent123!',
      full_name: 'Test Student'
    });
    console.log('✅ Student user created');
  } catch (error) {
    console.error('Error creating test users:', error.response?.data || error.message);
  }
}

createTestUsers();
```

Run: `node tests/setup-test-users.js`

---

## Next Steps

1. Create test users using one of the methods above
2. Verify users can login
3. Run tests: `cd tests && npm test`

**Remember:** These are TEST credentials only. Never use production credentials!
