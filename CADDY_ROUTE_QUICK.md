# ⚡ Quick Setup - Timetable as Route on Same Domain

> **✅ Login redirect fix applied** - No redirect loops in deployment. See `LOGIN_REDIRECT_FIX.md` for details.

## 🎯 Update Caddyfile (2 min)

```bash
sudo nano /etc/caddy/Caddyfile
```

**Update `mahmoudhaisam.com` block:**
```caddy
mahmoudhaisam.com, www.mahmoudhaisam.com {
    # Backend API - MUST BE FIRST
    reverse_proxy /api/* localhost:5001 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Frontend (Portfolio + Timetable)
    reverse_proxy localhost:8000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    header {
        Content-Security-Policy "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://mahmoudhaisam.com; frame-ancestors 'none';"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Strict-Transport-Security "max-age=15768000; includeSubDomains; preload"
    }
}
```

**Reload:**
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

---

## 🎯 Setup Backend (5 min)

```bash
cd /var/www/portfolio-timetable/backend
npm install --production
npm run build

# Create .env
nano .env
```

**Paste:**
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
ALLOWED_ORIGINS=https://mahmoudhaisam.com,https://www.mahmoudhaisam.com
CLIENT_URL=https://mahmoudhaisam.com
```

**Start:**
```bash
pm2 start dist/server.js --name timetable-backend
pm2 save
```

---

## 🎯 Setup Frontend (3 min)

```bash
cd /var/www/portfolio-timetable

# Create .env.local
nano .env.local
```

**Paste:**
```env
NEXT_PUBLIC_API_URL=https://mahmoudhaisam.com/api
```

**Build & Start:**
```bash
npm install --production
npm run build
pm2 restart portfolio-frontend  # or start if first time
pm2 save
```

---

## ✅ Verify

```bash
# Check services
pm2 status

# Test backend
curl https://mahmoudhaisam.com/api/health

# Visit in browser
# https://mahmoudhaisam.com/login
```

---

## 🎉 Done!

**Routes:**
- Portfolio: `https://mahmoudhaisam.com/`
- Login: `https://mahmoudhaisam.com/login`
- Student: `https://mahmoudhaisam.com/student/timetable`
- Admin: `https://mahmoudhaisam.com/admin/timetable`
- API: `https://mahmoudhaisam.com/api/*`

**See full guide:** `CADDY_ROUTE_DEPLOYMENT.md`
