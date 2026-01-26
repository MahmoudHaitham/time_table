# Complete Fix - Frontend API URL Issue

## The Problem

The frontend image was built with `NEXT_PUBLIC_API_URL=http://localhost:5000/api` baked into it. When accessed via `https://mahmoudhaisam.com`, the browser tries to connect to `http://localhost:5000/api` (the user's local machine), which fails.

## The Solution

Rebuild the frontend image with `NEXT_PUBLIC_API_URL=/api` (relative path) so Caddy can proxy it correctly.

## Step-by-Step Fix

### Option 1: Build on VPS (Fastest)

```bash
# 1. SSH into your VPS
ssh root@your-vps-ip

# 2. Navigate to portfolio directory
cd ~/portfolio

# 3. Make sure you have the latest code (if using git)
# git pull origin deploy  # Uncomment if using git

# 4. Build frontend with production API URL
cd cicd/linux
chmod +x build-frontend.sh
./build-frontend.sh

# 5. Restart containers with production config
cd ~/portfolio
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# 6. Check logs
docker logs portfolio-frontend
docker logs portfolio-backend

# 7. Test
curl https://www.mahmoudhaisam.com/api/health
```

### Option 2: Build Locally and Push (If VPS Build Fails)

On your Windows machine:

```powershell
cd C:\Users\Mahmoud Hitham\Desktop\Potfolio

# Build with production API URL
docker build --build-arg NEXT_PUBLIC_API_URL=/api -t mabouellais/timetable-frontend:deploy -f Dockerfile .

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push mabouellais/timetable-frontend:deploy
```

Then on VPS:

```bash
cd ~/portfolio
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Option 3: Use GitHub Actions (Recommended)

1. Commit and push all changes:
```bash
git add .
git commit -m "Fix frontend API URL for production"
git push origin deploy
```

2. Wait for GitHub Actions to complete (check Actions tab)

3. On VPS:
```bash
cd ~/portfolio
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Verify the Fix

After rebuilding, verify:

```bash
# 1. Check frontend is using correct API URL (should show /api in browser console)
# Open browser dev tools (F12) -> Console
# Look for API calls - they should go to /api/... not http://localhost:5000/api/...

# 2. Test backend directly
curl http://localhost:5002/health

# 3. Test through Caddy
curl https://www.mahmoudhaisam.com/api/health

# 4. Check container logs
docker logs portfolio-frontend | grep -i "ready\|error"
docker logs portfolio-backend | grep -i "cors\|allowed"
```

## Expected Behavior After Fix

✅ Frontend loads at `https://mahmoudhaisam.com/timetable`
✅ API calls go to `/api/...` (relative path)
✅ Caddy proxies `/api/*` to `localhost:5002` (backend)
✅ Backend CORS allows `https://www.mahmoudhaisam.com` and `https://mahmoudhaisam.com`
✅ No more "Unable to connect to server" errors

## Troubleshooting

**If still seeing `http://localhost:5000/api` in browser:**
- The image wasn't rebuilt correctly
- Check build logs to ensure `--build-arg NEXT_PUBLIC_API_URL=/api` was used
- Rebuild again

**If CORS errors persist:**
- Check backend logs: `docker logs portfolio-backend | grep CORS`
- Verify `CORS_ORIGIN` in `backend/.env` includes production domains
- Restart backend: `docker compose -f docker-compose.prod.yml restart backend`

**If 502 Bad Gateway:**
- Check containers are running: `docker ps`
- Check ports are bound: `sudo ss -tulnp | grep -E '5002|8001'`
- Reload Caddy: `sudo systemctl reload caddy`
