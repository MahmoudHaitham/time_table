# Fix Frontend Blank Page Issue

## Problem
Frontend shows blank page when accessing `mahmoudhaisam.com` because:
1. Wrong port mapping (using 5000/8000 instead of 5002/8001)
2. Wrong API URL (`http://localhost:5000` instead of `/api`)

## Solution

### Step 1: Stop Current Containers
```bash
cd ~/portfolio
docker compose down
```

### Step 2: Restart with Updated Configuration
```bash
docker compose up -d
```

### Step 3: Check Logs
```bash
docker logs portfolio-frontend
docker logs portfolio-backend
```

### Step 4: Test
```bash
# Test frontend
curl http://localhost:8001

# Test backend
curl http://localhost:5002/health

# Test through Caddy
curl https://www.mahmoudhaisam.com/api/health
```

## If Still Not Working: Rebuild Frontend

If the frontend still shows blank page, the `NEXT_PUBLIC_API_URL` might be baked into the image. Rebuild:

### Option A: Build on VPS
```bash
cd ~/portfolio/cicd/linux
./build-frontend.sh
cd ~/portfolio
docker compose pull
docker compose up -d
```

### Option B: Use GitHub Actions
1. Commit and push changes
2. Wait for GitHub Actions to build
3. Pull and restart on VPS

## Verify Configuration

After restart, verify the environment variables:

```bash
# Check frontend environment
docker exec portfolio-frontend env | grep NEXT_PUBLIC_API_URL

# Should show: NEXT_PUBLIC_API_URL=/api
```

## Expected Behavior

- Frontend accessible at: `https://www.mahmoudhaisam.com` or `https://mahmoudhaisam.com`
- API calls from frontend go to: `https://www.mahmoudhaisam.com/api/*`
- Caddy proxies `/api/*` to `localhost:5002` (backend)
- Caddy proxies everything else to `localhost:8001` (frontend)
