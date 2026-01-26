# Quick Build and Deploy - Frontend Fix

## The Problem
Frontend image has `http://localhost:5000/api` baked in. Need to rebuild with `/api`.

## Solution: Build Locally and Push

### Step 1: Build on Windows (PowerShell)

```powershell
cd C:\Users\Mahmoud Hitham\Desktop\Potfolio

# Build with production API URL
docker build --build-arg NEXT_PUBLIC_API_URL=/api -t mabouellais/timetable-frontend:deploy -f Dockerfile .

# Login to Docker Hub (if not already logged in)
docker login

# Push to Docker Hub
docker push mabouellais/timetable-frontend:deploy
```

**Note:** This will take 5-10 minutes depending on your internet speed.

### Step 2: On VPS - Pull and Restart

```bash
cd ~/portfolio

# Pull the new image
docker compose -f docker-compose.prod.yml pull

# Restart containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker logs portfolio-frontend | tail -20
docker logs portfolio-backend | grep CORS

# Test
curl https://www.mahmoudhaisam.com/api/health
```

### Step 3: Verify in Browser

Open `https://mahmoudhaisam.com/timetable` - should work now!

## Alternative: Use GitHub Actions

If local build fails or takes too long:

1. **Commit and push:**
```bash
git add .
git commit -m "Fix frontend API URL for production"
git push origin deploy
```

2. **Wait for GitHub Actions** (check Actions tab in GitHub)

3. **On VPS:**
```bash
cd ~/portfolio
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

**If build fails with network error:**
- Retry the build (network issues are usually temporary)
- Check your internet connection
- Try building at a different time

**If push fails:**
- Make sure you're logged in: `docker login`
- Check Docker Hub credentials

**After deploy, if still not working:**
- Check browser console (F12) - should see API calls to `/api/...` not `http://localhost:5000/api`
- Verify Caddy is proxying: `curl https://www.mahmoudhaisam.com/api/health`
- Check backend CORS logs: `docker logs portfolio-backend | grep CORS`
