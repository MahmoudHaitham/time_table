# 🚀 Hostinger VPS Deployment Guide
**Complete Step-by-Step Deployment for Timetable Management System**

---

## 📋 Prerequisites

- ✅ VPS with Hostinger (already have)
- ✅ SSH access to VPS
- ✅ Domain/subdomain configured (or use IP)
- ✅ PostgreSQL database (can install on VPS or use managed DB)

---

## 🎯 Deployment Architecture

```
Internet
   ↓
Nginx (Port 80/443) → Frontend (Next.js) - Port 8000
                    → Backend API (Express) - Port 5000
                    → PostgreSQL (Port 5432)
```

---

## Step 1: Connect to VPS via SSH

```bash
# Connect to your VPS
ssh root@your-vps-ip
# Or if using username:
ssh username@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

---

## Step 2: Install Required Software

### Install Node.js (v18 or higher)

```bash
# Install Node.js using NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE timetable_db;
CREATE USER timetable_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE timetable_db TO timetable_user;
\q
```

### Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## Step 3: Upload Project Files

### Option A: Using Git (Recommended)

```bash
# On your local machine
cd c:\Users\Mahmoud Hitham\Desktop\Potfolio
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main

# On VPS
cd /var/www
sudo git clone YOUR_GITHUB_REPO_URL timetable-system
sudo chown -R $USER:$USER timetable-system
cd timetable-system
```

### Option B: Using SCP (Direct Upload)

```bash
# On your local machine (PowerShell)
scp -r "c:\Users\Mahmoud Hitham\Desktop\Potfolio" root@your-vps-ip:/var/www/timetable-system

# On VPS
cd /var/www/timetable-system
```

---

## Step 4: Setup Backend

```bash
# Navigate to backend directory
cd /var/www/timetable-system/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
```

### Backend `.env` File Content:

```env
# REQUIRED - Generate these secrets (32+ characters each)
JWT_SECRET=your-generated-jwt-secret-32-characters-minimum
TERM_TOKEN_SECRET=your-generated-term-token-secret-32-characters-minimum

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=timetable_user
DB_PASSWORD=your_secure_password
DB_NAME=timetable_db
DB_SSL=false

# Server Configuration
PORT=5000
NODE_ENV=production

# CORS - Replace with your actual domain
ALLOWED_ORIGINS=https://mahmoudhaisam.com,https://timetable.mahmoudhaisam.com
CLIENT_URL=https://timetable.mahmoudhaisam.com
```

**Generate Secrets:**
```bash
# On VPS, generate secrets:
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for TERM_TOKEN_SECRET
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

```bash
# Build backend (if TypeScript)
npm run build

# Test backend starts
npm start
# Press Ctrl+C to stop
```

---

## Step 5: Setup Frontend

```bash
# Navigate to frontend directory
cd /var/www/timetable-system

# Install dependencies
npm install --production

# Create .env.local file
nano .env.local
```

### Frontend `.env.local` File Content:

```env
# Backend API URL - Use your domain or VPS IP
NEXT_PUBLIC_API_URL=https://timetable.mahmoudhaisam.com/api
# Or if using IP:
# NEXT_PUBLIC_API_URL=http://your-vps-ip:5000/api
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

```bash
# Build frontend
npm run build

# Test frontend starts
npm start
# Press Ctrl+C to stop
```

---

## Step 6: Configure PM2 (Process Manager)

### Start Backend with PM2

```bash
cd /var/www/timetable-system/backend

# Start backend
pm2 start dist/server.js --name timetable-backend

# Or if no build step:
pm2 start src/server.ts --name timetable-backend --interpreter ts-node

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs (usually starts with sudo)
```

### Start Frontend with PM2

```bash
cd /var/www/timetable-system

# Start frontend
pm2 start npm --name timetable-frontend -- start

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs
```

---

## Step 7: Configure Nginx Reverse Proxy

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/timetable-system
```

### Nginx Configuration Content:

```nginx
# Frontend (Next.js) - Port 8000
server {
    listen 80;
    server_name timetable.mahmoudhaisam.com;  # Or your subdomain
    
    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (Express) - Port 5000
server {
    listen 80;
    server_name api.timetable.mahmoudhaisam.com;  # Or api.yourdomain.com
    
    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Alternative: Single Domain Setup** (if you prefer one domain):

```nginx
server {
    listen 80;
    server_name timetable.mahmoudhaisam.com;

    # Frontend
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (if needed)
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Credentials true always;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### Enable Site and Test

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/timetable-system /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## Step 8: Setup SSL/HTTPS (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d timetable.mahmoudhaisam.com -d api.timetable.mahmoudhaisam.com

# Or for single domain:
sudo certbot --nginx -d timetable.mahmoudhaisam.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect HTTP to HTTPS (option 2)

# Auto-renewal is set up automatically
```

### Update Nginx Config for HTTPS

After SSL setup, Certbot will update your config. Verify:

```bash
sudo nano /etc/nginx/sites-available/timetable-system
```

Should have `listen 443 ssl;` and SSL certificate paths.

---

## Step 9: Update Environment Variables

### Update Backend `.env` for HTTPS:

```bash
cd /var/www/timetable-system/backend
nano .env
```

Update:
```env
ALLOWED_ORIGINS=https://timetable.mahmoudhaisam.com
CLIENT_URL=https://timetable.mahmoudhaisam.com
```

### Update Frontend `.env.local`:

```bash
cd /var/www/timetable-system
nano .env.local
```

Update:
```env
NEXT_PUBLIC_API_URL=https://timetable.mahmoudhaisam.com/api
# Or if using separate API domain:
# NEXT_PUBLIC_API_URL=https://api.timetable.mahmoudhaisam.com/api
```

### Restart Services:

```bash
# Restart backend
pm2 restart timetable-backend

# Restart frontend
pm2 restart timetable-frontend

# Restart Nginx
sudo systemctl restart nginx
```

---

## Step 10: Configure Firewall

```bash
# Allow HTTP, HTTPS, SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 11: Setup Domain/Subdomain

### In Hostinger Control Panel:

1. **Go to DNS Management**
2. **Add A Record:**
   - **Name:** `timetable` (or `api` for API subdomain)
   - **Type:** A
   - **Value:** Your VPS IP address
   - **TTL:** 3600

3. **Wait for DNS propagation** (5-60 minutes)

### Verify DNS:

```bash
# Check DNS resolution
nslookup timetable.mahmoudhaisam.com
# Should return your VPS IP
```

---

## Step 12: Create Test Users

```bash
# Connect to PostgreSQL
sudo -u postgres psql -d timetable_db

# Create admin user (you'll need to use registration endpoint or direct SQL)
# Option 1: Use registration API endpoint
# Option 2: Insert directly (requires password hash)
```

**Using API (Recommended):**
```bash
# After deployment, register admin via API:
curl -X POST https://timetable.mahmoudhaisam.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "registration_number": "admin001",
    "password": "YourSecurePassword123!",
    "full_name": "Admin User"
  }'
```

---

## Step 13: Verify Deployment

### 1. Check Backend Health

```bash
curl http://localhost:5000/health
# Should return: {"status":"ok",...}

# Or via domain:
curl https://timetable.mahmoudhaisam.com/api/health
```

### 2. Check Frontend

```bash
# Visit in browser:
https://timetable.mahmoudhaisam.com
```

### 3. Check PM2 Status

```bash
pm2 status
pm2 logs timetable-backend
pm2 logs timetable-frontend
```

### 4. Check Nginx Status

```bash
sudo systemctl status nginx
sudo nginx -t
```

---

## Step 14: Setup Auto-Deployment (Optional)

### Using GitHub Webhook:

```bash
# Install webhook handler (optional)
# Or use simple git pull script
```

### Simple Update Script:

```bash
# Create update script
nano /var/www/timetable-system/update.sh
```

```bash
#!/bin/bash
cd /var/www/timetable-system
git pull origin main
cd backend
npm install --production
npm run build
pm2 restart timetable-backend
cd ..
npm install --production
npm run build
pm2 restart timetable-frontend
echo "Deployment complete!"
```

```bash
# Make executable
chmod +x /var/www/timetable-system/update.sh
```

---

## 🔧 Troubleshooting

### Backend Not Starting

```bash
# Check logs
pm2 logs timetable-backend

# Check if port 5000 is in use
sudo netstat -tulpn | grep 5000

# Check environment variables
cd /var/www/timetable-system/backend
cat .env
```

### Frontend Not Starting

```bash
# Check logs
pm2 logs timetable-frontend

# Check if port 8000 is in use
sudo netstat -tulpn | grep 8000

# Rebuild
cd /var/www/timetable-system
npm run build
pm2 restart timetable-frontend
```

### Nginx Errors

```bash
# Check error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
sudo -u postgres psql -d timetable_db

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection from backend
cd /var/www/timetable-system/backend
node -e "require('./dist/config/data-source').AppDataSource.initialize().then(() => console.log('Connected')).catch(e => console.error(e))"
```

---

## 📊 Monitoring Commands

### Check All Services:

```bash
# PM2 status
pm2 status
pm2 monit

# Nginx status
sudo systemctl status nginx

# PostgreSQL status
sudo systemctl status postgresql

# Check ports
sudo netstat -tulpn | grep -E '5000|8000|5432'
```

### View Logs:

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

---

## 🔒 Security Checklist

- [ ] ✅ Firewall configured (UFW)
- [ ] ✅ SSL/HTTPS enabled
- [ ] ✅ Strong secrets in `.env` (32+ characters)
- [ ] ✅ Database password secure
- [ ] ✅ `.env` files not in git
- [ ] ✅ SSH key authentication (disable password login)
- [ ] ✅ Regular backups configured
- [ ] ✅ PM2 auto-restart on crash
- [ ] ✅ Nginx security headers (already configured)

---

## 📝 Quick Reference Commands

```bash
# Restart everything
pm2 restart all
sudo systemctl restart nginx

# View logs
pm2 logs
pm2 logs timetable-backend --lines 100
pm2 logs timetable-frontend --lines 100

# Update code
cd /var/www/timetable-system
git pull
cd backend && npm install && npm run build && pm2 restart timetable-backend
cd .. && npm install && npm run build && pm2 restart timetable-frontend

# Check status
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

## 🎉 Deployment Complete!

Your system should now be accessible at:
- **Frontend:** `https://timetable.mahmoudhaisam.com`
- **Backend API:** `https://timetable.mahmoudhaisam.com/api` (or `https://api.timetable.mahmoudhaisam.com`)

---

## 📞 Next Steps

1. ✅ Test login functionality
2. ✅ Create admin user
3. ✅ Test schedule generation
4. ✅ Test PDF export
5. ✅ Monitor logs for errors
6. ✅ Setup backups (database + files)

---

**Your Timetable Management System is now live!** 🚀
