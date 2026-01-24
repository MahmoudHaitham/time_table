# ⚡ Quick Caddy Setup for Timetable System

## 🎯 Your Current Setup
- ✅ Caddy installed
- ✅ Portfolio: `mahmoudhaisam.com` → port 8000
- ✅ Exam System: `exam.mahmoudhaisam.com` → ports 3000/5000
- ✅ Cloud database ready

---

## Step 1: Add to Caddyfile (2 min)

```bash
sudo nano /etc/caddy/Caddyfile
```

**Add at the end:**
```caddy
timetable.mahmoudhaisam.com {
    reverse_proxy /api/* localhost:5001
    reverse_proxy localhost:8001
    
    header {
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://timetable.mahmoudhaisam.com; frame-ancestors 'none';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=15768000; includeSubDomains; preload"
    }
}
```

**Reload Caddy:**
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## Step 2: Upload Project (5 min)

```bash
cd /var/www
git clone YOUR_REPO_URL timetable-system
cd timetable-system
```

---

## Step 3: Setup Backend (5 min)

```bash
cd backend
npm install --production
npm run build

# Create .env
nano .env
```

**Paste (update values):**
```env
JWT_SECRET=$(openssl rand -base64 32)
TERM_TOKEN_SECRET=$(openssl rand -base64 32)
DB_HOST=your-cloud-db-host.com
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=timetable_db
DB_SSL=true
PORT=5001
NODE_ENV=production
ALLOWED_ORIGINS=https://timetable.mahmoudhaisam.com
CLIENT_URL=https://timetable.mahmoudhaisam.com
```

**Start:**
```bash
pm2 start dist/server.js --name timetable-backend
pm2 save
```

---

## Step 4: Setup Frontend (5 min)

```bash
cd /var/www/timetable-system
npm install --production
npm run build

# Create .env.local
nano .env.local
```

**Paste:**
```env
NEXT_PUBLIC_API_URL=https://timetable.mahmoudhaisam.com/api
```

**Update package.json start script:**
```bash
nano package.json
# Change: "start": "next start -p 8001"
```

**Start:**
```bash
pm2 start npm --name timetable-frontend -- start
pm2 save
```

---

## Step 5: Setup DNS (3 min)

**In Hostinger DNS:**
- Add A Record: `timetable` → Your VPS IP
- Wait 5-60 minutes

---

## ✅ Verify

```bash
# Check services
pm2 status

# Test backend
curl http://localhost:5001/health

# Visit frontend
# https://timetable.mahmoudhaisam.com
```

---

## 🎉 Done!

**System URL:** `https://timetable.mahmoudhaisam.com`

**Ports Used:**
- Backend: `5001` (different from exam system's 5000)
- Frontend: `8001` (different from portfolio's 8000)

**See full guide:** `CADDY_DEPLOYMENT.md`
