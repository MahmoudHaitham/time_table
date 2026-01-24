# 🚀 Caddy Deployment - Timetable as Route on Same Domain

## 📋 Your Setup
- ✅ Portfolio: `mahmoudhaisam.com` → port 8000 (Next.js)
- ✅ Timetable routes: Already part of the same Next.js app (`/student/timetable`, `/admin/timetable`, `/login`)
- ✅ Backend API: Needs to be added to `/api/*` route

---

## ⚠️ IMPORTANT: Login Redirect Fix

**Before deploying, ensure you have the latest code with the login redirect fix applied.**

The fix ensures:
- ✅ No redirect loops after login
- ✅ Proper cookie and sessionStorage handling
- ✅ Consistent authentication checks

See `LOGIN_REDIRECT_FIX.md` for details.

---

## 🎯 Step 1: Update Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

**Update the `mahmoudhaisam.com` block to include backend API:**

```caddy
exam.mahmoudhaisam.com {
    # Backend API - intercept before frontend
    reverse_proxy /api/* localhost:5000
    reverse_proxy /socket.io/* localhost:5000
    
    # Frontend - everything else
    reverse_proxy localhost:3000
}

mahmoudhaisam.com, www.mahmoudhaisam.com {
    # Backend API for Timetable System - MUST BE BEFORE frontend
    reverse_proxy /api/* localhost:5001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Frontend (Portfolio + Timetable routes) - everything else
    reverse_proxy localhost:8000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Security headers
    header {
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://mahmoudhaisam.com; frame-ancestors 'none';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=15768000; includeSubDomains; preload"
    }
}

clinic.mohamedfouadelnaggar.cloud {
    reverse_proxy 127.0.0.1:7000

    header {
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=15768000; includeSubDomains; preload"
    }
}
```

**Important:** The `/api/*` route MUST come BEFORE the general `reverse_proxy` so Caddy routes API requests to the backend first.

**Reload Caddy:**
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## 🎯 Step 2: Upload Project (if not already done)

```bash
# Navigate to your projects directory
cd /var/www  # or wherever you keep projects

# If you haven't uploaded yet:
git clone YOUR_REPO_URL portfolio-timetable
cd portfolio-timetable

# Or if already uploaded, just navigate to it
cd /var/www/portfolio-timetable  # adjust path as needed
```

---

## 🎯 Step 3: Setup Backend

```bash
cd backend

# Install dependencies
npm install --production

# Create .env file
nano .env
```

### Backend `.env` Configuration:

```env
# REQUIRED - Generate strong secrets (32+ characters)
JWT_SECRET=your-generated-jwt-secret-32-characters-minimum
TERM_TOKEN_SECRET=your-generated-term-token-secret-32-characters-minimum

# Database Configuration (Cloud Database)
DB_HOST=your-cloud-db-host.com
DB_PORT=5432
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=timetable_db
DB_SSL=true

# Server Configuration
PORT=5001  # Different from exam system (5000)
NODE_ENV=production

# CORS - Use your actual domain
ALLOWED_ORIGINS=https://mahmoudhaisam.com,https://www.mahmoudhaisam.com
CLIENT_URL=https://mahmoudhaisam.com
```

**Generate Secrets:**
```bash
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for TERM_TOKEN_SECRET
```

**Build and Start:**
```bash
# Build backend
npm run build

# Start with PM2
pm2 start dist/server.js --name timetable-backend

# Save PM2 config
pm2 save
```

---

## 🎯 Step 4: Setup Frontend

```bash
cd /var/www/portfolio-timetable  # or your project path

# Install dependencies (if not already done)
npm install --production

# Create .env.local file
nano .env.local
```

### Frontend `.env.local` Configuration:

```env
# Backend API URL - Use same domain
NEXT_PUBLIC_API_URL=https://mahmoudhaisam.com/api
```

**Build and Start:**
```bash
# Build frontend (includes portfolio + timetable routes)
npm run build

# Start with PM2 (on port 8000 - same as portfolio)
pm2 start npm --name portfolio-frontend -- start

# Or if already running, restart:
pm2 restart portfolio-frontend

# Save PM2 config
pm2 save
```

---

## 🎯 Step 5: Verify Deployment

### Check Services:
```bash
# PM2 status
pm2 status

# Check if ports are listening
sudo netstat -tulpn | grep -E '5001|8000'

# Check Caddy logs
sudo journalctl -u caddy -f
```

### Test Backend:
```bash
# Health check
curl http://localhost:5001/health

# Via domain
curl https://mahmoudhaisam.com/api/health
```

### Test Frontend Routes:
```bash
# Portfolio homepage
curl https://mahmoudhaisam.com

# Timetable login
curl https://mahmoudhaisam.com/login

# Student timetable (will redirect if not logged in)
curl https://mahmoudhaisam.com/student/timetable
```

### Visit in Browser:
- **Portfolio:** `https://mahmoudhaisam.com`
- **Timetable Login:** `https://mahmoudhaisam.com/login`
- **Student Timetable:** `https://mahmoudhaisam.com/student/timetable`
- **Admin Panel:** `https://mahmoudhaisam.com/admin/timetable`

---

## 📊 Complete Caddyfile

Here's your complete updated Caddyfile:

```caddy
exam.mahmoudhaisam.com {
    # Backend API - intercept before frontend
    reverse_proxy /api/* localhost:5000
    reverse_proxy /socket.io/* localhost:5000
    
    # Frontend - everything else
    reverse_proxy localhost:3000
}

mahmoudhaisam.com, www.mahmoudhaisam.com {
    # Backend API for Timetable System - MUST BE FIRST
    reverse_proxy /api/* localhost:5001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Frontend (Portfolio + Timetable) - everything else
    reverse_proxy localhost:8000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Security headers
    header {
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://mahmoudhaisam.com; frame-ancestors 'none';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=15768000; includeSubDomains; preload"
    }
}

clinic.mohamedfouadelnaggar.cloud {
    reverse_proxy 127.0.0.1:7000

    header {
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=15768000; includeSubDomains; preload"
    }
}
```

---

## 🔧 Troubleshooting

### Backend Not Responding

```bash
# Check logs
pm2 logs timetable-backend

# Check if port 5001 is in use
sudo netstat -tulpn | grep 5001

# Test backend directly
curl http://localhost:5001/health
```

### Frontend Routes Not Working

```bash
# Check logs
pm2 logs portfolio-frontend

# Check if port 8000 is in use
sudo netstat -tulpn | grep 8000

# Rebuild if needed
npm run build
pm2 restart portfolio-frontend
```

### API Calls Failing

1. **Check Caddy routing:**
   ```bash
   # Test API via domain
   curl https://mahmoudhaisam.com/api/health
   ```

2. **Check environment variable:**
   ```bash
   # Verify .env.local exists
   cat .env.local
   # Should show: NEXT_PUBLIC_API_URL=https://mahmoudhaisam.com/api
   ```

3. **Check CORS in backend:**
   ```bash
   # Verify backend .env has correct ALLOWED_ORIGINS
   cd backend
   cat .env | grep ALLOWED_ORIGINS
   ```

### Caddy Errors

```bash
# Check Caddy logs
sudo journalctl -u caddy -f

# Validate Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy
sudo systemctl reload caddy
```

---

## 📊 Monitoring Commands

```bash
# Check all services
pm2 status
pm2 monit

# Check Caddy status
sudo systemctl status caddy

# Check ports
sudo netstat -tulpn | grep -E '5001|8000'

# View logs
pm2 logs
pm2 logs timetable-backend --lines 100
pm2 logs portfolio-frontend --lines 100
sudo journalctl -u caddy -f
```

---

## 🔄 Update Deployment Script

```bash
nano /var/www/portfolio-timetable/deploy.sh
```

```bash
#!/bin/bash
set -e

cd /var/www/portfolio-timetable

# Pull latest code
git pull origin main || echo "Not a git repo, skipping pull"

# Backend
cd backend
npm install --production
npm run build
pm2 restart timetable-backend

# Frontend
cd ..
npm install --production
npm run build
pm2 restart portfolio-frontend

# Reload Caddy
sudo systemctl reload caddy

echo "✅ Deployment complete!"
```

Make executable:
```bash
chmod +x /var/www/portfolio-timetable/deploy.sh
```

---

## ✅ Quick Reference

**Your Routes:**
- **Portfolio:** `https://mahmoudhaisam.com/` → port 8000
- **Timetable Login:** `https://mahmoudhaisam.com/login` → port 8000
- **Student Timetable:** `https://mahmoudhaisam.com/student/timetable` → port 8000
- **Admin Panel:** `https://mahmoudhaisam.com/admin/timetable` → port 8000
- **Backend API:** `https://mahmoudhaisam.com/api/*` → port 5001

**PM2 Commands:**
```bash
pm2 status
pm2 restart timetable-backend
pm2 restart portfolio-frontend
pm2 logs timetable-backend
pm2 logs portfolio-frontend
```

**Caddy Commands:**
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

---

## 🎉 Deployment Complete!

Everything is now on the same domain:
- ✅ Portfolio: `https://mahmoudhaisam.com`
- ✅ Timetable System: `https://mahmoudhaisam.com/login`, `/student/timetable`, `/admin/timetable`
- ✅ Backend API: `https://mahmoudhaisam.com/api`

**No DNS changes needed** - everything uses the same domain! 🚀
