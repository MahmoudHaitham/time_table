# ⚡ Hostinger VPS Quick Start Guide

## 🎯 Quick Deployment (30 minutes)

---

## Step 1: Connect & Install (5 min)

```bash
# Connect to VPS
ssh root@your-vps-ip

# Install Node.js, PostgreSQL, Nginx, PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update
sudo apt install -y nodejs postgresql postgresql-contrib nginx
sudo npm install -g pm2

# Setup PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE timetable_db;"
sudo -u postgres psql -c "CREATE USER timetable_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE timetable_db TO timetable_user;"
```

---

## Step 2: Upload Project (5 min)

```bash
# On VPS
cd /var/www
sudo git clone YOUR_GITHUB_REPO_URL timetable-system
sudo chown -R $USER:$USER timetable-system
cd timetable-system
```

---

## Step 3: Setup Backend (5 min)

```bash
cd backend

# Install & Build
npm install --production
npm run build

# Create .env
nano .env
```

**Paste this (update values):**
```env
JWT_SECRET=$(openssl rand -base64 32)
TERM_TOKEN_SECRET=$(openssl rand -base64 32)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=timetable_user
DB_PASSWORD=your_password
DB_NAME=timetable_db
DB_SSL=false
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=https://timetable.mahmoudhaisam.com
CLIENT_URL=https://timetable.mahmoudhaisam.com
```

**Start with PM2:**
```bash
pm2 start dist/server.js --name timetable-backend
pm2 save
pm2 startup  # Run the command it outputs
```

---

## Step 4: Setup Frontend (5 min)

```bash
cd /var/www/timetable-system

# Install & Build
npm install --production
npm run build

# Create .env.local
nano .env.local
```

**Paste:**
```env
NEXT_PUBLIC_API_URL=https://timetable.mahmoudhaisam.com/api
```

**Start with PM2:**
```bash
pm2 start npm --name timetable-frontend -- start
pm2 save
```

---

## Step 5: Configure Nginx (5 min)

```bash
sudo nano /etc/nginx/sites-available/timetable-system
```

**Paste:**
```nginx
server {
    listen 80;
    server_name timetable.mahmoudhaisam.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable & Test:**
```bash
sudo ln -s /etc/nginx/sites-available/timetable-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: Setup SSL (5 min)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d timetable.mahmoudhaisam.com
# Follow prompts, choose option 2 (redirect HTTP to HTTPS)
```

---

## Step 7: Configure Firewall (2 min)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Step 8: Setup DNS (3 min)

**In Hostinger DNS Panel:**
- Add A Record: `timetable` → Your VPS IP
- Wait 5-60 minutes for propagation

---

## ✅ Verify Deployment

```bash
# Check services
pm2 status
sudo systemctl status nginx

# Test backend
curl https://timetable.mahmoudhaisam.com/api/health

# Visit frontend
# https://timetable.mahmoudhaisam.com
```

---

## 🎉 Done!

**Your system is live at:** `https://timetable.mahmoudhaisam.com`

**See full guide:** `HOSTINGER_VPS_DEPLOYMENT.md`
