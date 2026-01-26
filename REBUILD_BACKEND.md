# Rebuild Backend to Add /api/health Endpoint

## Quick Steps

The `/api/health` endpoint has been added to the code, but you need to rebuild and redeploy the backend container.

## Option 1: Build on VPS (If code is on VPS)

```bash
# Navigate to your portfolio directory
cd ~/portfolio

# Make sure you have the latest code (if using git)
# git pull origin deploy  # Uncomment if using git

# Build and push backend
cd cicd/linux
./build-backend.sh

# Restart containers
cd ~/portfolio
docker compose pull
docker compose up -d

# Check logs
docker logs portfolio-backend
```

## Option 2: Build Locally (Windows) and Push

On your Windows machine:

```powershell
cd cicd\windows
.\build-backend.ps1
```

Then on VPS:

```bash
cd ~/portfolio
docker compose pull
docker compose up -d
```

## Option 3: Use GitHub Actions (Recommended)

1. **Commit and push the changes:**
   ```bash
   git add backend/src/app.ts
   git commit -m "Add /api/health endpoint"
   git push origin deploy
   ```

2. **Wait for GitHub Actions to complete** (check Actions tab in GitHub)

3. **On VPS, pull and restart:**
   ```bash
   cd ~/portfolio
   docker compose pull
   docker compose up -d
   ```

## Verify the Fix

After redeployment, test:

```bash
# Should now work!
curl https://www.mahmoudhaisam.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2026-01-25T...",
  "cors": {
    "origin": "none",
    "allowed": true
  }
}
```

## Troubleshooting

**If you get "No such file or directory" when running build script:**
- Make sure you're in the correct directory
- Check that the script has execute permissions: `chmod +x cicd/linux/build-backend.sh`

**If build fails:**
- Check that Docker is running: `docker ps`
- Check that you're logged into Docker Hub: `docker login`
- Check Docker Hub credentials in `cicd/.env`

**If container doesn't restart:**
- Check logs: `docker logs portfolio-backend`
- Check if container is running: `docker ps`
- Force recreate: `docker compose up -d --force-recreate backend`
