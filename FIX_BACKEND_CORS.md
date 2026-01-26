# Fix Backend CORS and Frontend API URL

## Problem
1. Backend CORS only allows `http://localhost:8000, http://localhost:3000` 
2. Frontend is trying to connect to `http://localhost:5000/api` instead of `/api`

## Solution

### Step 1: Update Backend .env File

On your VPS, edit `~/portfolio/backend/.env`:

```bash
cd ~/portfolio
nano backend/.env
```

**Change this line:**
```
CORS_ORIGIN=https://www.mahmoudhaisam.com,https://mahmoudhaisam.com
```

**To this:**
```
ALLOWED_ORIGINS=https://www.mahmoudhaisam.com,https://mahmoudhaisam.com
```

**OR add this line if CORS_ORIGIN doesn't exist:**
```
ALLOWED_ORIGINS=https://www.mahmoudhaisam.com,https://mahmoudhaisam.com
```

**Save and exit** (Ctrl+X, then Y, then Enter)

### Step 2: Restart Backend Container

```bash
cd ~/portfolio
docker compose restart backend
```

### Step 3: Verify Backend CORS Configuration

```bash
docker logs portfolio-backend | grep CORS
```

**Expected output:**
```
🌐 CORS Configuration: PRODUCTION (strict origin checking)
   Allowed origins: https://www.mahmoudhaisam.com, https://mahmoudhaisam.com
```

### Step 4: Rebuild Frontend Image

The frontend image needs to be rebuilt with `NEXT_PUBLIC_API_URL=/api`:

**Option A: Build on VPS**
```bash
cd ~/portfolio/cicd/linux
./build-frontend.sh
cd ~/portfolio
docker compose pull
docker compose up -d
```

**Option B: Use GitHub Actions (Recommended)**
1. Commit and push the docker-compose.yml changes
2. Wait for GitHub Actions to build
3. Pull and restart on VPS

### Step 5: Verify Frontend Environment

After rebuilding, check the frontend environment:

```bash
docker exec portfolio-frontend env | grep NEXT_PUBLIC_API_URL
```

**Expected:** `NEXT_PUBLIC_API_URL=/api`

### Step 6: Test

```bash
# Test backend directly
curl http://localhost:5002/health

# Test through Caddy
curl https://www.mahmoudhaisam.com/api/health

# Check browser - should work now!
```

## Quick Fix Script

Run this on your VPS:

```bash
#!/bin/bash
cd ~/portfolio

# Update backend .env
if grep -q "CORS_ORIGIN" backend/.env; then
    sed -i 's/CORS_ORIGIN=/ALLOWED_ORIGINS=/' backend/.env
    echo "✅ Updated CORS_ORIGIN to ALLOWED_ORIGINS"
fi

if ! grep -q "ALLOWED_ORIGINS" backend/.env; then
    echo "ALLOWED_ORIGINS=https://www.mahmoudhaisam.com,https://mahmoudhaisam.com" >> backend/.env
    echo "✅ Added ALLOWED_ORIGINS"
fi

# Restart backend
docker compose restart backend
echo "✅ Backend restarted"

# Wait and check logs
sleep 3
echo ""
echo "CORS Configuration:"
docker logs portfolio-backend 2>&1 | grep -A 1 "CORS Configuration"
```
