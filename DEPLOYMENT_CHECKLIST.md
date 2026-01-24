# ✅ Hostinger VPS Deployment Checklist

## Pre-Deployment

- [ ] SSH access to VPS confirmed
- [ ] Domain/subdomain DNS configured (A record pointing to VPS IP)
- [ ] GitHub repository created (if using Git)
- [ ] All environment variables documented

---

## Step 1: Initial VPS Setup

- [ ] Connected to VPS via SSH
- [ ] System updated (`sudo apt update && sudo apt upgrade -y`)
- [ ] Node.js 20.x installed (`node --version`)
- [ ] PostgreSQL installed and running (`sudo systemctl status postgresql`)
- [ ] Nginx installed (`sudo systemctl status nginx`)
- [ ] PM2 installed globally (`pm2 --version`)

---

## Step 2: Database Setup

- [ ] PostgreSQL database created (`timetable_db`)
- [ ] Database user created (`timetable_user`)
- [ ] User granted privileges
- [ ] Database connection tested (`sudo -u postgres psql -d timetable_db`)

---

## Step 3: Project Upload

- [ ] Project files uploaded to `/var/www/timetable-system`
- [ ] File permissions set (`sudo chown -R $USER:$USER timetable-system`)
- [ ] Project structure verified (`ls -la`)

---

## Step 4: Backend Configuration

- [ ] Navigated to `backend/` directory
- [ ] Dependencies installed (`npm install --production`)
- [ ] `.env` file created with:
  - [ ] `JWT_SECRET` (32+ characters)
  - [ ] `TERM_TOKEN_SECRET` (32+ characters)
  - [ ] Database credentials
  - [ ] `PORT=5000`
  - [ ] `NODE_ENV=production`
  - [ ] `ALLOWED_ORIGINS` (your domain)
  - [ ] `CLIENT_URL` (your domain)
- [ ] Backend built (`npm run build`)
- [ ] Backend started with PM2 (`pm2 start dist/server.js --name timetable-backend`)
- [ ] PM2 startup configured (`pm2 startup` + ran command)
- [ ] Backend health checked (`curl http://localhost:5000/health`)

---

## Step 5: Frontend Configuration

- [ ] Navigated to project root directory
- [ ] Dependencies installed (`npm install --production`)
- [ ] `.env.local` file created with:
  - [ ] `NEXT_PUBLIC_API_URL` (your domain + `/api`)
- [ ] Frontend built (`npm run build`)
- [ ] Frontend started with PM2 (`pm2 start npm --name timetable-frontend -- start`)
- [ ] PM2 configuration saved (`pm2 save`)

---

## Step 6: Nginx Configuration

- [ ] Nginx config file created (`/etc/nginx/sites-available/timetable-system`)
- [ ] Config includes:
  - [ ] Frontend proxy (port 8000)
  - [ ] Backend API proxy (port 5000)
  - [ ] Proper headers (X-Real-IP, X-Forwarded-For, etc.)
- [ ] Site enabled (`sudo ln -s /etc/nginx/sites-available/timetable-system /etc/nginx/sites-enabled/`)
- [ ] Nginx config tested (`sudo nginx -t`)
- [ ] Nginx reloaded (`sudo systemctl reload nginx`)

---

## Step 7: SSL/HTTPS Setup

- [ ] Certbot installed (`sudo apt install certbot python3-certbot-nginx`)
- [ ] SSL certificate obtained (`sudo certbot --nginx -d your-domain.com`)
- [ ] HTTP to HTTPS redirect enabled
- [ ] SSL auto-renewal verified (`sudo certbot renew --dry-run`)

---

## Step 8: Environment Variables Updated

- [ ] Backend `.env` updated with HTTPS URLs
- [ ] Frontend `.env.local` updated with HTTPS API URL
- [ ] Services restarted:
  - [ ] Backend restarted (`pm2 restart timetable-backend`)
  - [ ] Frontend restarted (`pm2 restart timetable-frontend`)
  - [ ] Nginx restarted (`sudo systemctl restart nginx`)

---

## Step 9: Firewall Configuration

- [ ] UFW firewall enabled (`sudo ufw enable`)
- [ ] Port 22 (SSH) allowed
- [ ] Port 80 (HTTP) allowed
- [ ] Port 443 (HTTPS) allowed
- [ ] Firewall status verified (`sudo ufw status`)

---

## Step 10: DNS Configuration

- [ ] A record added in Hostinger DNS panel
- [ ] DNS propagation verified (`nslookup your-domain.com`)
- [ ] Domain resolves to VPS IP

---

## Step 11: Testing & Verification

- [ ] Backend health endpoint accessible (`curl https://your-domain.com/api/health`)
- [ ] Frontend loads in browser (`https://your-domain.com`)
- [ ] Login page accessible
- [ ] API endpoints responding
- [ ] CORS working correctly
- [ ] HTTPS certificate valid (green lock in browser)
- [ ] No console errors in browser DevTools

---

## Step 12: Create Test Users

- [ ] Admin user created (via registration API or direct SQL)
- [ ] Student user created (optional, for testing)
- [ ] Login tested with admin credentials
- [ ] Admin panel accessible

---

## Step 13: Monitoring Setup

- [ ] PM2 monitoring enabled (`pm2 monit`)
- [ ] Logs accessible (`pm2 logs`)
- [ ] Nginx logs accessible (`sudo tail -f /var/log/nginx/error.log`)
- [ ] System resources monitored (`htop` or `top`)

---

## Step 14: Backup Configuration

- [ ] Database backup script created
- [ ] Backup schedule configured (cron job)
- [ ] Backup location verified
- [ ] Backup restoration tested

---

## Post-Deployment

- [ ] All services running (`pm2 status`)
- [ ] No errors in logs (`pm2 logs --lines 50`)
- [ ] System performance acceptable
- [ ] Security headers verified (using online tools)
- [ ] SSL grade checked (SSL Labs)
- [ ] Documentation updated

---

## 🎉 Deployment Complete!

**System URL:** `https://your-domain.com`

**Quick Commands:**
```bash
# Check status
pm2 status
sudo systemctl status nginx

# View logs
pm2 logs
pm2 logs timetable-backend --lines 100
pm2 logs timetable-frontend --lines 100

# Restart services
pm2 restart all
sudo systemctl restart nginx

# Update deployment
cd /var/www/timetable-system
git pull
./deploy.sh  # If using deployment script
```

---

## 🔧 Troubleshooting

If something fails, check:
1. PM2 logs: `pm2 logs`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Backend logs: `pm2 logs timetable-backend`
4. Frontend logs: `pm2 logs timetable-frontend`
5. Database connection: `sudo -u postgres psql -d timetable_db`
6. Port availability: `sudo netstat -tulpn | grep -E '5000|8000'`

---

**Need help?** Refer to `HOSTINGER_VPS_DEPLOYMENT.md` for detailed instructions.
