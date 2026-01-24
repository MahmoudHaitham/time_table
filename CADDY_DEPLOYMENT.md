# 🚀 Caddy Deployment Guide for Timetable Management System

## 📋 Your Current Setup

Based on your Caddyfile, you have:
- ✅ Caddy installed and configured
- ✅ Portfolio at `mahmoudhaisam.com` (port 8000)
- ✅ Exam system at `exam.mahmoudhaisam.com` (port 3000 frontend, port 5000 backend)
- ✅ Database on cloud (not local PostgreSQL)

---

## 🎯 Step 1: Add Timetable System to Caddyfile

### Option A: Use Subdomain (Recommended)
```bash
sudo nano /etc/caddy/Caddyfile
```

Add this configuration (choose one):

**For subdomain `timetable.mahmoudhaisam.com`:**
```caddy
timetable.mahmoudhaisam.com {
    # Backend API - intercept before frontend
    reverse_proxy /api/* localhost:5001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Frontend - everything else
    reverse_proxy localhost:8001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Security headers
    header {
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://timetable.mahmoudhaisam.com; frame-ancestors 'none';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=15768000; includeSubDomains; preload"
    }
}
```

**For path-based routing `mahmoudhaisam.com/timetable`:**
```caddy
mahmoudhaisam.com, www.mahmoudhaisam.com {
    # Timetable Backend API
    reverse_proxy /timetable/api/* localhost:5001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Timetable Frontend
    reverse_proxy /timetable/* localhost:8001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Portfolio (existing)
    reverse_proxy localhost:8000
}
```

**Note:** I'm using ports `5001` and `8001` to avoid conflicts with your exam system (which uses 5000 and 3000). If you prefer different ports, adjust accordingly.

---

## 🎯 Step 2: Reload Caddy

```bash
# Test Caddyfile syntax
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy (if test passes)
sudo systemctl reload caddy

# Or restart if needed
sudo systemctl restart caddy

# Check status
sudo systemctl status caddy
```

---

## 🎯 Step 3: Setup Project on VPS

```bash
# Navigate to your projects directory (adjust path as needed)
cd /var/www  # or wherever you keep your projects

# Clone or upload project
# Option A: Git
git clone YOUR_REPO_URL timetable-system
cd timetable-system

# Option B: Upload via SCP from your local machine
# (then cd to the directory)
```

---

## 🎯 Step 4: Configure Backend

```bash
cd /var/www/timetable-system/backend

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
DB_SSL=true  # Usually true for cloud databases

# Server Configuration
PORT=5001  # Different from exam system (5000)
NODE_ENV=production

# CORS - Use your actual domain
ALLOWED_ORIGINS=https://timetable.mahmoudhaisam.com
CLIENT_URL=https://timetable.mahmoudhaisam.com
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
pm2 start dist/server.js --name timetable-backend -- --port 5001

# Or if you need to specify port in code, use:
# PORT=5001 pm2 start dist/server.js --name timetable-backend

# Save PM2 config
pm2 save
```

---

## 🎯 Step 5: Configure Frontend

```bash
cd /var/www/timetable-system

# Install dependencies
npm install --production

# Create .env.local file
nano .env.local
```

### Frontend `.env.local` Configuration:

```env
# Backend API URL - Use your domain
NEXT_PUBLIC_API_URL=https://timetable.mahmoudhaisam.com/api
```

**Build and Start:**
```bash
# Build frontend
npm run build

# Start with PM2 (on port 8001)
PORT=8001 pm2 start npm --name timetable-frontend -- start

# Or modify package.json start script to include port:
# "start": "next start -p 8001"

# Save PM2 config
pm2 save
```

---

## 🎯 Step 6: Update package.json Start Script (Optional)

If you want to hardcode the port in `package.json`:

```bash
nano package.json
```

Update the start script:
```json
{
  "scripts": {
    "start": "next start -p 8001"
  }
}
```

Then start with:
```bash
pm2 start npm --name timetable-frontend -- start
```

---

## 🎯 Step 7: Setup DNS

### In Hostinger DNS Panel:

1. **Go to DNS Management**
2. **Add A Record:**
   - **Name:** `timetable` (for subdomain) or leave blank (for main domain)
   - **Type:** A
   - **Value:** Your VPS IP address
   - **TTL:** 3600

3. **Wait for DNS propagation** (5-60 minutes)

### Verify DNS:
```bash
nslookup timetable.mahmoudhaisam.com
# Should return your VPS IP
```

---

## 🎯 Step 8: Verify Deployment

### Check Services:
```bash
# PM2 status
pm2 status

# Check if ports are listening
sudo netstat -tulpn | grep -E '5001|8001'

# Check Caddy logs
sudo journalctl -u caddy -f
```

### Test Backend:
```bash
# Health check
curl http://localhost:5001/health

# Via domain (after DNS propagation)
curl https://timetable.mahmoudhaisam.com/api/health
```

### Test Frontend:
```bash
# Visit in browser
https://timetable.mahmoudhaisam.com
```

---

## 🔧 Complete Caddyfile Example

Here's your complete Caddyfile with the timetable system added:

```caddy
exam.mahmoudhaisam.com {
    # Backend API - intercept before frontend
    reverse_proxy /api/* localhost:5000
    reverse_proxy /socket.io/* localhost:5000
    
    # Frontend - everything else
    reverse_proxy localhost:3000
}

mahmoudhaisam.com, www.mahmoudhaisam.com {
    reverse_proxy localhost:8000
}

timetable.mahmoudhaisam.com {
    # Backend API - intercept before frontend
    reverse_proxy /api/* localhost:5001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Frontend - everything else
    reverse_proxy localhost:8001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    # Security headers
    header {
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://timetable.mahmoudhaisam.com; frame-ancestors 'none';"
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

### Backend Not Starting

```bash
# Check logs
pm2 logs timetable-backend

# Check if port 5001 is in use
sudo netstat -tulpn | grep 5001

# Check environment variables
cd /var/www/timetable-system/backend
cat .env
```

### Frontend Not Starting

```bash
# Check logs
pm2 logs timetable-frontend

# Check if port 8001 is in use
sudo netstat -tulpn | grep 8001

# Rebuild if needed
cd /var/www/timetable-system
npm run build
pm2 restart timetable-frontend
```

### Caddy Errors

```bash
# Check Caddy logs
sudo journalctl -u caddy -f

# Validate Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile

# Test Caddy config
sudo caddy adapt --config /etc/caddy/Caddyfile

# Reload Caddy
sudo systemctl reload caddy
```

### Database Connection Issues

```bash
# Test database connection from VPS
# Install PostgreSQL client if needed
sudo apt install postgresql-client -y

# Test connection
psql -h your-cloud-db-host.com -U your_db_username -d timetable_db

# Check backend logs for DB errors
pm2 logs timetable-backend | grep -i database
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
sudo netstat -tulpn | grep -E '5001|8001'

# View logs
pm2 logs
pm2 logs timetable-backend --lines 100
pm2 logs timetable-frontend --lines 100
sudo journalctl -u caddy -f
```

---

## 🔄 Update Deployment Script

Create/update your deployment script:

```bash
nano /var/www/timetable-system/deploy.sh
```

```bash
#!/bin/bash
set -e

cd /var/www/timetable-system

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
pm2 restart timetable-frontend

# Reload Caddy
sudo systemctl reload caddy

echo "✅ Deployment complete!"
```

Make executable:
```bash
chmod +x /var/www/timetable-system/deploy.sh
```

---

## ✅ Quick Reference

**Your Services:**
- Portfolio: `mahmoudhaisam.com` → `localhost:8000`
- Exam System: `exam.mahmoudhaisam.com` → `localhost:3000` (frontend), `localhost:5000` (backend)
- **Timetable System:** `timetable.mahmoudhaisam.com` → `localhost:8001` (frontend), `localhost:5001` (backend)

**PM2 Commands:**
```bash
pm2 status
pm2 restart timetable-backend
pm2 restart timetable-frontend
pm2 logs timetable-backend
pm2 logs timetable-frontend
```

**Caddy Commands:**
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

---

## 🎉 Deployment Complete!

Your Timetable Management System should now be accessible at:
- **Frontend:** `https://timetable.mahmoudhaisam.com`
- **Backend API:** `https://timetable.mahmoudhaisam.com/api`

**Next Steps:**
1. ✅ Test login functionality
2. ✅ Create admin user
3. ✅ Test schedule generation
4. ✅ Monitor logs for errors

---

**Need help?** Check PM2 logs and Caddy logs for any errors!
