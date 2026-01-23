# Environment Variables Setup Guide

This guide explains what environment variables you need to set up for the application.

## 📁 File Locations

- **Backend**: `backend/.env` (copy from `backend/.env.example`)
- **Frontend**: `.env.local` (copy from `.env.example`)

---

## 🔧 Backend Environment Variables (`backend/.env`)

### Required Variables

#### 1. **JWT_SECRET** (REQUIRED)
- **Purpose**: Secret key for signing JWT access tokens
- **Minimum Length**: 32 characters
- **How to generate**:
  ```bash
  # Option 1: Using OpenSSL
  openssl rand -base64 32
  
  # Option 2: Using Node.js
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- **Example**: `JWT_SECRET=aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1p`

#### 2. **TERM_TOKEN_SECRET** (REQUIRED)
- **Purpose**: Secret key for encoding/decoding term IDs in URLs
- **Minimum Length**: 32 characters
- **Generate the same way as JWT_SECRET**
- **Example**: `TERM_TOKEN_SECRET=xY9zA7bC5dE3fG1hI9jK7lM5nO3pQ1rS9tU7vW5xY3zA1bC9dE7fG5hI`

#### 3. **Database Configuration** (REQUIRED)
```env
DB_HOST=your_database_host
DB_PORT=5432
DB_USERNAME=your_database_username
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
DB_SSL=true  # Set to "true" for cloud databases, "false" for local
```

**Examples:**

**Local PostgreSQL:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_local_password
DB_NAME=timetable_db
DB_SSL=false
```

**Neon (Cloud PostgreSQL):**
```env
DB_HOST=ep-red-shadow-ahrwwfce-pooler.c-3.us-east-1.aws.neon.tech
DB_PORT=5432
DB_USERNAME=neondb_owner
DB_PASSWORD=your_neon_password
DB_NAME=neondb
DB_SSL=true
```

**Supabase:**
```env
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_supabase_password
DB_NAME=postgres
DB_SSL=true
```

### Optional Variables

#### **PORT** (Optional)
- **Default**: `5000`
- **Purpose**: Port for the backend server
- **Example**: `PORT=5000`

#### **NODE_ENV** (Optional)
- **Default**: `development`
- **Values**: `development` or `production`
- **Purpose**: Sets the environment mode
- **Example**: `NODE_ENV=development`

#### **ALLOWED_ORIGINS** (Optional)
- **Default**: `http://localhost:8000,http://localhost:3000`
- **Purpose**: Comma-separated list of allowed CORS origins
- **Example**: `ALLOWED_ORIGINS=http://localhost:8000,https://yourdomain.com`

#### **CLIENT_URL** (Optional)
- **Purpose**: Single allowed origin (alternative to ALLOWED_ORIGINS)
- **Example**: `CLIENT_URL=http://localhost:8000`

---

## 🌐 Frontend Environment Variables (`.env.local`)

### Required Variables

#### **NEXT_PUBLIC_API_URL** (REQUIRED)
- **Purpose**: Backend API URL for frontend to connect to
- **For local development**: `http://localhost:5000/api`
- **For production**: `https://your-backend-api.com/api`
- **Example**: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets in these variables!

---

## 🚀 Quick Setup

### Step 1: Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Copy the example file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and fill in your values:
   ```bash
   # Generate secrets
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For TERM_TOKEN_SECRET
   
   # Edit .env file with your values
   ```

### Step 2: Frontend Setup

1. In the root directory, copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

### Step 3: Verify Setup

1. **Backend**: Start the server and check for errors:
   ```bash
   cd backend
   npm run dev
   ```
   - If you see errors about missing JWT_SECRET or TERM_TOKEN_SECRET, check your `.env` file

2. **Frontend**: Start the dev server:
   ```bash
   npm run dev
   ```

---

## 🔒 Security Best Practices

1. **Never commit `.env` files to git**
   - They're already in `.gitignore`
   - Double-check before committing

2. **Use strong, random secrets**
   - Minimum 32 characters
   - Use cryptographically secure random generators

3. **Different secrets for different environments**
   - Use different `JWT_SECRET` and `TERM_TOKEN_SECRET` for dev/prod

4. **Rotate secrets periodically**
   - Especially if compromised
   - Users will need to re-login after rotation

5. **Protect database credentials**
   - Never expose in client-side code
   - Use connection pooling for production

---

## 📝 Example `.env` Files

### `backend/.env` (Complete Example)
```env
NODE_ENV=development
PORT=5000

JWT_SECRET=aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1p
TERM_TOKEN_SECRET=xY9zA7bC5dE3fG1hI9jK7lM5nO3pQ1rS9tU7vW5xY3zA1bC9dE7fG5hI

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=mypassword123
DB_NAME=timetable_db
DB_SSL=false
```

### `.env.local` (Complete Example)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## ❓ Troubleshooting

### Error: "JWT_SECRET must be at least 32 characters"
- **Solution**: Generate a longer secret using the commands above

### Error: "Cannot connect to database"
- **Solution**: 
  - Check database credentials
  - Verify database is running
  - Check `DB_SSL` setting (should be `true` for cloud databases)

### Error: "Failed to fetch" in frontend
- **Solution**: 
  - Check `NEXT_PUBLIC_API_URL` is correct
  - Verify backend is running
  - Check CORS configuration

---

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html)
