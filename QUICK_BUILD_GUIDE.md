# Quick Build & Deploy Guide

## 🖥️ Local Windows Build (Your Device)

### 1. Create `cicd/.env` file
```
DOCKERUSER=mabouellais
DOCKERTOKEN=your_docker_hub_token
```

### 2. Build Images
```powershell
cd cicd\windows
.\build-all.ps1
```

### 3. Test Locally
```powershell
# From project root
docker-compose up -d

# Open browser: http://localhost:8000

# Stop when done
docker-compose down
```

---

## 🚀 VPS Deployment

### VPS Structure:
```
/portfolio/
├── backend/
│   └── .env
├── cicd/
│   ├── .env
│   └── linux/
│       ├── build-all.sh
│       ├── build-backend.sh
│       ├── build-frontend.sh
│       └── docker-login.sh
└── docker-compose.yml
```

### On VPS:
```bash
# 1. Make scripts executable
cd /portfolio/cicd/linux
chmod +x *.sh

# 2. Build images
./build-all.sh

# 3. Start services
cd /portfolio
docker-compose up -d
```

---

**That's it!** 🎉
