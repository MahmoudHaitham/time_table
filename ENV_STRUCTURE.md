# Environment Variables Structure

This document outlines all environment variables needed for the Timetable Management System.

## 📁 File Locations

### Backend Environment File
**Location:** `backend/.env`

### Frontend Environment File  
**Location:** `.env.local` (in project root)

---

## 🔧 Backend Environment Variables (`backend/.env`)

### Database Configuration (PostgreSQL on neon.tech)

```env
# Database Host (from neon.tech connection string)
DB_HOST=your-neon-host.neon.tech

# Database Port (usually 5432 for PostgreSQL)
DB_PORT=5432

# Database Username (from neon.tech)
DB_USERNAME=your-username

# Database Password (from neon.tech)
DB_PASSWORD=your-password

# Database Name (from neon.tech)
DB_NAME=your-database-name

# SSL Enabled (MUST be true for neon.tech)
DB_SSL=true
```

### Server Configuration

```env
# Backend Server Port (default: 5000)
PORT=5000

# Backend Server Host (default: localhost)
HOST=localhost

# Node Environment (development | production)
NODE_ENV=development
```

### CORS Configuration

```env
# Single Frontend URL (alternative to ALLOWED_ORIGINS)
CLIENT_URL=http://localhost:8000

# Multiple Allowed Origins (comma-separated)
# Used if CLIENT_URL is not set, or for multiple origins
ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3000
```

---

## 🎨 Frontend Environment Variables (`.env.local`)

```env
# Backend API URL
# This tells the frontend where to find the backend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Note:** In Next.js, environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## 📋 Complete Example Files

### `backend/.env` (Complete Example)

```env
# ============================================
# Database Configuration (PostgreSQL on neon.tech)
# ============================================
DB_HOST=ep-cool-name-123456.us-east-2.aws.neon.tech
DB_PORT=5432
DB_USERNAME=neondb_user
DB_PASSWORD=your-secure-password-here
DB_NAME=neondb
DB_SSL=true

# ============================================
# Server Configuration
# ============================================
PORT=5000
HOST=localhost
NODE_ENV=development

# ============================================
# CORS Configuration
# ============================================
# Option 1: Single URL
CLIENT_URL=http://localhost:8000

# Option 2: Multiple URLs (comma-separated)
# ALLOWED_ORIGINS=http://localhost:8000,http://localhost:3000,https://yourdomain.com
```

### `.env.local` (Complete Example)

```env
# ============================================
# Frontend Configuration
# ============================================
# Backend API Base URL
# Make sure this matches your backend PORT
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🔍 How to Get neon.tech Database Credentials

1. **Log in to neon.tech**
2. **Select your project**
3. **Go to Connection Details** or **Connection String**
4. **Extract the following:**
   - `DB_HOST`: The hostname (e.g., `ep-cool-name-123456.us-east-2.aws.neon.tech`)
   - `DB_PORT`: Usually `5432`
   - `DB_USERNAME`: The username from connection string
   - `DB_PASSWORD`: The password from connection string
   - `DB_NAME`: The database name

**Example Connection String:**
```
postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
```

**Extracted Values:**
- `DB_HOST=ep-cool-name-123456.us-east-2.aws.neon.tech`
- `DB_PORT=5432`
- `DB_USERNAME=username`
- `DB_PASSWORD=password`
- `DB_NAME=neondb`
- `DB_SSL=true` (because `sslmode=require`)

---

## ⚙️ Environment Variable Usage

### Backend Usage

| Variable | Used In | Purpose |
|----------|---------|---------|
| `DB_HOST` | `data-source.ts` | PostgreSQL connection host |
| `DB_PORT` | `data-source.ts` | PostgreSQL connection port |
| `DB_USERNAME` | `data-source.ts` | Database username |
| `DB_PASSWORD` | `data-source.ts` | Database password |
| `DB_NAME` | `data-source.ts` | Database name |
| `DB_SSL` | `data-source.ts` | Enable SSL for neon.tech |
| `PORT` | `server.ts` | Backend server port |
| `HOST` | `server.ts` | Backend server host |
| `NODE_ENV` | `app.ts`, `data-source.ts` | Environment mode |
| `CLIENT_URL` | `app.ts` | CORS allowed origin |
| `ALLOWED_ORIGINS` | `app.ts` | Multiple CORS origins |

### Frontend Usage

| Variable | Used In | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `lib/api/timetable.ts` | Backend API base URL |

---

## 🔒 Security Notes

1. **Never commit `.env` files to Git**
   - Add `.env` to `.gitignore`
   - Add `.env.local` to `.gitignore`

2. **Use different values for production**
   - Production database credentials
   - Production frontend URL
   - `NODE_ENV=production`

3. **Keep passwords secure**
   - Use strong passwords
   - Rotate passwords regularly
   - Don't share credentials

---

## ✅ Verification Checklist

After setting up environment variables:

- [ ] Backend `.env` file exists in `backend/` directory
- [ ] Frontend `.env.local` file exists in project root
- [ ] All database credentials are correct
- [ ] `DB_SSL=true` for neon.tech
- [ ] `CLIENT_URL` matches frontend URL
- [ ] `NEXT_PUBLIC_API_URL` matches backend URL
- [ ] Backend starts without errors
- [ ] Frontend can connect to backend
- [ ] Database connection successful (check backend console)

---

## 🐛 Troubleshooting

### Backend can't connect to database
- Check `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- Verify `DB_SSL=true` for neon.tech
- Check network connectivity

### CORS errors in frontend
- Verify `CLIENT_URL` or `ALLOWED_ORIGINS` includes frontend URL
- Check frontend is running on the URL specified
- Ensure backend is running

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_URL` matches backend URL
- Check backend is running on specified PORT
- Check firewall/network settings

---

## 📝 Quick Reference

**Backend `.env` minimum required:**
```env
DB_HOST=your-host.neon.tech
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=your-database
DB_SSL=true
PORT=5000
CLIENT_URL=http://localhost:8000
```

**Frontend `.env.local` minimum required:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

**Last Updated:** System completion date  
**Status:** ✅ Production Ready

