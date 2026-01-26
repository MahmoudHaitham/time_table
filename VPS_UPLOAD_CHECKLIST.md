# VPS Upload Checklist

## 📁 Files to Upload to VPS

### Directory Structure on VPS:
```
/portfolio/
├── backend/
│   └── .env                    # ⚠️ Create this manually on VPS (DO NOT upload)
├── cicd/
│   ├── .env                    # ⚠️ Create this manually on VPS (DO NOT upload)
│   └── linux/
│       ├── build-all.sh
│       ├── build-backend.sh
│       ├── build-frontend.sh
│       └── docker-login.sh
└── docker-compose.yml          # Use docker-compose.prod.yml (rename it)
```

---

## ✅ Files to Upload

### 1. Backend Folder
Upload the entire `backend/` folder **EXCEPT**:
- ❌ `backend/.env` - Create manually on VPS with your production values

**What to upload:**
- `backend/src/` (all source files)
- `backend/package.json`
- `backend/package-lock.json`
- `backend/tsconfig.json`
- `backend/Dockerfile`
- `backend/.dockerignore`

### 2. CICD Folder
Upload `cicd/linux/` folder with all scripts:
- `cicd/linux/build-all.sh`
- `cicd/linux/build-backend.sh`
- `cicd/linux/build-frontend.sh`
- `cicd/linux/docker-login.sh`

**DO NOT upload:**
- ❌ `cicd/.env` - Create manually on VPS

### 3. Docker Compose
Upload `docker-compose.prod.yml` and rename it to `docker-compose.yml` on VPS

### 4. Caddyfile
Upload `Caddyfile` to `/etc/caddy/Caddyfile` on VPS (or wherever your Caddy config is)

---

## ⚠️ Files to Create Manually on VPS

### 1. `/portfolio/backend/.env`
Create this file with your backend environment variables:
```bash
# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Server
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# CORS (if needed)
CORS_ORIGIN=https://www.mahmoudhaisam.com
```

### 2. `/portfolio/cicd/.env`
Create this file with Docker Hub credentials:
```bash
DOCKERUSER=mabouellais
DOCKERTOKEN=your_docker_hub_token
```

---

## 🚀 Upload Commands

### Option 1: Using SCP
```bash
# From your local machine
cd C:\Users\Mahmoud Hitham\Desktop\Potfolio

# Upload backend (excluding .env)
scp -r backend user@your-vps-ip:/portfolio/
scp -r cicd/linux user@your-vps-ip:/portfolio/cicd/
scp docker-compose.prod.yml user@your-vps-ip:/portfolio/docker-compose.yml
scp Caddyfile user@your-vps-ip:/tmp/Caddyfile
```

### Option 2: Using Git
```bash
# On VPS
cd /portfolio
git clone your-repo-url .
# Then manually copy only needed folders
```

---

## 📋 Post-Upload Steps on VPS

1. **Create .env files:**
   ```bash
   cd /portfolio/backend
   nano .env  # Add your backend env vars
   
   cd /portfolio/cicd
   nano .env  # Add Docker Hub credentials
   ```

2. **Make scripts executable:**
   ```bash
   cd /portfolio/cicd/linux
   chmod +x *.sh
   ```

3. **Update Caddyfile:**
   ```bash
   sudo cp /tmp/Caddyfile /etc/caddy/Caddyfile
   sudo caddy reload
   ```

4. **Build images (or pull from Docker Hub):**
   ```bash
   cd /portfolio/cicd/linux
   ./build-all.sh
   # OR pull existing images:
   cd /portfolio
   docker-compose pull
   ```

5. **Start services:**
   ```bash
   cd /portfolio
   docker-compose up -d
   ```

6. **Verify:**
   ```bash
   docker ps
   docker-compose logs -f
   ```

---

## ✅ Verification Checklist

- [ ] Backend folder uploaded (without .env)
- [ ] CICD/linux scripts uploaded
- [ ] docker-compose.yml uploaded (from docker-compose.prod.yml)
- [ ] Caddyfile uploaded
- [ ] backend/.env created on VPS
- [ ] cicd/.env created on VPS
- [ ] Scripts are executable
- [ ] Caddyfile updated and reloaded
- [ ] Images built or pulled
- [ ] Services running
- [ ] Test: https://www.mahmoudhaisam.com

---

**Ready to deploy!** 🚀
