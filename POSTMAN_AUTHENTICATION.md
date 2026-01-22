# 🔐 Postman Authentication Guide

## Problem
You're getting this error:
```json
{
    "success": false,
    "message": "Authentication required"
}
```

## Solution: Authenticate First!

---

## Step 1: Register or Login

### Option A: Register (New User)

**POST** `http://localhost:5000/api/auth/register`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "registration_number": "admin001",
  "password": "your_secure_password",
  "full_name": "Admin User"
}
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "registration_number": "admin001",
      "full_name": "Admin User",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJlZ2lzdHJhdGlvbk51bWJlciI6ImFkbWluMDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA5ODc2NTQzLCJleHAiOjE3MTA0ODEzNDN9.xxxxx"
  }
}
```

### Option B: Login (Existing User)

**POST** `http://localhost:5000/api/auth/login`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "registration_number": "admin001",
  "password": "your_secure_password"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "registration_number": "admin001",
      "full_name": "Admin User",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJlZ2lzdHJhdGlvbk51bWJlciI6ImFkbWluMDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA5ODc2NTQzLCJleHAiOjE3MTA0ODEzNDN9.xxxxx"
  }
}
```

---

## Step 2: Copy the Token

From the response above, copy the `token` value:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJlZ2lzdHJhdGlvbk51bWJlciI6ImFkbWluMDAxIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzA5ODc2NTQzLCJleHAiOjE3MTA0ODEzNDN9.xxxxx
```

---

## Step 3: Use Token in Postman

### Method 1: Authorization Tab (Recommended)

1. In Postman, go to the **Authorization** tab
2. Select **Bearer Token** from the **Type** dropdown
3. Paste your token in the **Token** field
4. Click **Send**

### Method 2: Headers Tab

1. In Postman, go to the **Headers** tab
2. Add a new header:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_TOKEN_HERE`
   - Replace `YOUR_TOKEN_HERE` with your actual token

### Method 3: Collection-Level Authorization (Best for Multiple Requests)

1. Right-click on your Postman Collection
2. Select **Edit**
3. Go to **Authorization** tab
4. Select **Bearer Token** from Type dropdown
5. Paste your token
6. All requests in the collection will use this token automatically

---

## Step 4: Test Authentication

**GET** `http://localhost:5000/api/auth/me`

**Headers**:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "registration_number": "admin001",
    "full_name": "Admin User",
    "role": "admin"
  }
}
```

If you get this response, authentication is working! ✅

---

## Important Notes

1. **Token Expiration**: Tokens expire after 7 days. You'll need to login again after expiration.

2. **All Admin Routes Require Token**: 
   - `/api/terms/*`
   - `/api/courses/*`
   - `/api/classes/*`
   - `/api/components/*`
   - `/api/sessions/*`
   - `/api/class-courses/*`

3. **Public Routes (No Token Needed)**:
   - `/api/auth/register`
   - `/api/auth/login`
   - `/api/timetable/*` (student/public routes)

4. **Role Requirement**: User must have `role: "admin"` to access admin routes.

---

## Quick Test in Postman

1. **Register/Login**:
   ```
   POST http://localhost:5000/api/auth/login
   Body: {"registration_number": "admin001", "password": "your_password"}
   ```

2. **Copy Token** from response

3. **Set Authorization**:
   - Go to Authorization tab
   - Select "Bearer Token"
   - Paste token

4. **Test**:
   ```
   GET http://localhost:5000/api/terms
   ```

If you get a list of terms (or empty array), authentication is working! 🎉

---

## Troubleshooting

### Error: "Authentication required"
- **Solution**: Make sure you've added the `Authorization: Bearer TOKEN` header

### Error: "Invalid token"
- **Solution**: Token may have expired. Login again to get a new token.

### Error: "Admin access required"
- **Solution**: Your user doesn't have admin role. Make sure you registered/login with a user that has `role: "admin"`

### Token Not Working
- Check that you're using `Bearer ` (with space) before the token
- Make sure there are no extra spaces or characters
- Try logging in again to get a fresh token

