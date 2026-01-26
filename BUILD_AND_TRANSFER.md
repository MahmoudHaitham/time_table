# Build Frontend Locally and Transfer to VPS

## Step 1: Build Frontend Image Locally (Windows)

Build with production API URL (`/api`):

```powershell
cd C:\Users\Mahmoud Hitham\Desktop\Potfolio
docker build --build-arg NEXT_PUBLIC_API_URL=/api -t mabouellais/timetable-frontend:deploy -f Dockerfile .
```

## Step 2: Save Image to File

```powershell
# Save the image to a tar file
docker save mabouellais/timetable-frontend:deploy -o frontend-image.tar

# Or compress it (recommended - smaller file)
docker save mabouellais/timetable-frontend:deploy | gzip > frontend-image.tar.gz
```

**Note:** If you don't have `gzip` on Windows, use 7-Zip or just save as `.tar` (will be larger).

## Step 3: Transfer to VPS

### Option A: Using SCP (if you have SSH access)
```powershell
# From Windows PowerShell (if you have scp/ssh)
scp frontend-image.tar.gz root@your-vps-ip:/root/portfolio/
```

### Option B: Using WinSCP or FileZilla
1. Connect to your VPS via SFTP
2. Upload `frontend-image.tar.gz` to `/root/portfolio/`

### Option C: Using Cloud Storage
1. Upload to Google Drive/Dropbox
2. Download on VPS using `wget` or `curl`

## Step 4: Load Image on VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Navigate to portfolio directory
cd ~/portfolio

# If compressed, decompress first
gunzip frontend-image.tar.gz
# OR if using tar.gz
tar -xzf frontend-image.tar.gz  # This might not work, use gunzip first

# Load the image
docker load -i frontend-image.tar

# Verify image is loaded
docker images | grep timetable-frontend
```

## Step 5: Restart Containers

```bash
cd ~/portfolio
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Check logs
docker logs portfolio-frontend
```

## Step 6: Test

```bash
# Test backend
curl http://localhost:5002/health

# Test frontend
curl http://localhost:8001

# Test through Caddy
curl https://www.mahmoudhaisam.com/api/health
```

## Alternative: Push to Docker Hub (Easier)

Instead of transferring files, you can push to Docker Hub:

```powershell
# Build locally
docker build --build-arg NEXT_PUBLIC_API_URL=/api -t mabouellais/timetable-frontend:deploy -f Dockerfile .

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push mabouellais/timetable-frontend:deploy

# Then on VPS, just pull
cd ~/portfolio
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

This is easier and faster than transferring large tar files!
