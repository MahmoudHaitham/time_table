# VPS Deployment Guide - Portfolio Structure

## 📁 VPS Directory Structure

```
/portfolio/
├── backend/
│   └── .env                    # Backend environment variables
├── cicd/
│   ├── .env                    # Docker Hub credentials (DOCKERUSER, DOCKERTOKEN)
│   └── linux/
│       ├── build-all.sh        # Build both images
│       ├── build-backend.sh    # Build backend only
│       ├── build-frontend.sh   # Build frontend only
│       └── docker-login.sh     # Docker Hub login
└── docker-compose.yml          # Docker Compose configuration
```

---

## 🖥️ Local Windows Build (Your Device)

### Step 1: Create cicd/.env file

Create `cicd/.env` with:
```
DOCKERUSER=mabouellais
DOCKERTOKEN=your_docker_hub_token_here
```

### Step 2: Build Images

```powershell
# Navigate to cicd/windows
cd cicd\windows

# Build all images
.\build-all.ps1
```

Or build individually:
```powershell
.\build-backend.ps1
.\build-frontend.ps1
```

### Step 3: Test Locally

```powershell
# From project root, start containers
docker-compose up -d

# Check if running
docker ps

# Test frontend
# Open browser: http://localhost:8000

# Stop when done testing
docker-compose down
```

---

## 🚀 VPS Deployment

### Step 1: Create Directory Structure on VPS

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Create portfolio directory
mkdir -p /portfolio/backend
mkdir -p /portfolio/cicd/linux
```

### Step 2: Upload Files to VPS

**Option A: Using SCP**
```bash
# From your local machine
scp -r backend user@your-vps-ip:/portfolio/
scp -r cicd user@your-vps-ip:/portfolio/
scp docker-compose.yml user@your-vps-ip:/portfolio/
```

**Option B: Using Git**
```bash
# On VPS
cd /portfolio
git clone your-repo-url .
# Then copy only needed folders:
# - backend/
# - cicd/
# - docker-compose.yml
```

### Step 3: Create Environment Files on VPS

**Create `/portfolio/backend/.env`:**
```bash
cd /portfolio/backend
nano .env
# Add your backend environment variables
```

**Create `/portfolio/cicd/.env`:**
```bash
cd /portfolio/cicd
nano .env
# Add:
# DOCKERUSER=mabouellais
# DOCKERTOKEN=your_docker_hub_token
```

### Step 4: Make Scripts Executable

```bash
cd /portfolio/cicd/linux
chmod +x *.sh
```

### Step 5: Build Images on VPS

```bash
cd /portfolio/cicd/linux
./build-all.sh
```

Or build individually:
```bash
./build-backend.sh
./build-frontend.sh
```

### Step 6: Start Services

```bash
cd /portfolio
docker-compose up -d
```

### Step 7: Check Status

```bash
# Check running containers
docker ps

# Check logs
docker-compose logs -f

# Test backend
curl http://localhost:5000/api/health

# Test frontend
curl http://localhost:8000
```

---

## 🔄 Updating Deployment

### Option 1: Rebuild on VPS

```bash
cd /portfolio/cicd/linux
./build-all.sh
cd /portfolio
docker-compose up -d --force-recreate
```

### Option 2: Pull from Docker Hub (if built elsewhere)

```bash
cd /portfolio
docker-compose pull
docker-compose up -d
```

---

## 📋 File Checklist

### On Your Local Device:
- [ ] `cicd/.env` created with Docker Hub credentials
- [ ] Images built successfully (`docker images` to verify)
- [ ] Tested locally at `http://localhost:8000`

### On VPS:
- [ ] `/portfolio/backend/.env` created
- [ ] `/portfolio/cicd/.env` created
- [ ] `/portfolio/cicd/linux/*.sh` files are executable
- [ ] `/portfolio/docker-compose.yml` exists
- [ ] Images built or pulled
- [ ] Services running (`docker ps`)

---

## 🐛 Troubleshooting

### Build fails on VPS:
```bash
# Check Docker is running
docker ps

# Check .env file exists
ls -la /portfolio/cicd/.env
cat /portfolio/cicd/.env

# Check script permissions
ls -la /portfolio/cicd/linux/*.sh
```

### Services won't start:
```bash
# Check logs
docker-compose logs

# Check if images exist
docker images | grep aast

# Check if ports are available
netstat -tulpn | grep -E '5000|8000'
```

### Frontend can't connect to backend:
- Check `API_URL` and `NEXT_PUBLIC_API_URL` in docker-compose.yml
- Verify both containers are on same network
- Check backend is running: `docker logs portfolio-backend`

---

## 📝 Quick Commands Reference

```bash
# Build all images
cd /portfolio/cicd/linux && ./build-all.sh

# Start services
cd /portfolio && docker-compose up -d

# Stop services
cd /portfolio && docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update and restart
docker-compose pull && docker-compose up -d
```

---

**Your deployment structure is ready!** 🎉
