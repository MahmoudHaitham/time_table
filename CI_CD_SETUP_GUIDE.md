# CI/CD Setup Guide - Next Steps

## ✅ Step 1: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

   **Secret 1:**
   - Name: `DOCKER_HUB_USERNAME`
   - Value: `mabouellais`

   **Secret 2:**
   - Name: `DOCKER_HUB_TOKEN`
   - Value: Your Docker Hub access token
     - Get token from: https://hub.docker.com/settings/security
     - Click **New Access Token**
     - Name it (e.g., "GitHub Actions")
     - Copy the token and paste as the secret value

---

## ✅ Step 2: Create Deploy Branch

```bash
# Create and switch to deploy branch
git checkout -b deploy

# Push deploy branch to GitHub
git push -u origin deploy
```

---

## ✅ Step 3: Test Local Build (Optional)

Test building images locally before pushing:

### Windows PowerShell:

```powershell
# Navigate to project root
cd "C:\Users\Mahmoud Hitham\Desktop\Potfolio"

# Create cicd/.env file for Docker login
# Create the file with:
# DOCKERUSER=mabouellais
# DOCKERTOKEN=your_docker_hub_token

# Build both images
.\cicd\windows\build-all.ps1
```

### Or build individually:

```powershell
# Build backend only
.\cicd\windows\build-backend.ps1

# Build frontend only
.\cicd\windows\build-frontend.ps1
```

---

## ✅ Step 4: Push to Trigger CI/CD

```bash
# Make sure you're on deploy branch
git checkout deploy

# Add all files
git add .

# Commit changes
git commit -m "Add CI/CD pipeline"

# Push to trigger GitHub Actions
git push origin deploy
```

**Check GitHub Actions:**
- Go to your repo → **Actions** tab
- You should see the workflow running
- Wait for it to complete (builds and pushes images to Docker Hub)

---

## ✅ Step 5: Deploy on Your Server

### Option A: Use Pre-built Images (from GitHub Actions)

```bash
# SSH into your server
ssh user@your-server

# Navigate to project directory
cd /path/to/your/project

# Pull latest code (or clone if first time)
git clone your-repo-url .
git checkout deploy

# Pull images from Docker Hub
docker pull mabouellais/aast-backend:deploy
docker pull mabouellais/aast-frontend:deploy

# Make sure backend/.env exists on server
# (Create it manually with your environment variables)

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### Option B: Build Locally on Server

```bash
# SSH into your server
ssh user@your-server

# Navigate to project directory
cd /path/to/your/project

# Pull latest code
git pull origin deploy

# Build images locally (if you want to build on server)
docker-compose build

# Start services
docker-compose up -d
```

---

## ✅ Step 6: Verify Deployment

```bash
# Check running containers
docker ps

# Check logs
docker-compose logs backend
docker-compose logs frontend

# Test backend
curl http://localhost:5000/api/health

# Test frontend
curl http://localhost:8000
```

---

## 🔄 Future Deployments

After initial setup, deploying updates is simple:

1. **Make changes** in your code
2. **Commit and push** to `deploy` branch:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin deploy
   ```
3. **GitHub Actions** automatically builds and pushes new images
4. **On server**, pull and restart:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

---

## 📋 Quick Reference

### Important Files:
- `.github/workflows/docker-build-push.yml` - CI/CD workflow
- `docker-compose.yml` - Docker Compose configuration
- `Dockerfile` - Frontend Dockerfile (root)
- `backend/Dockerfile` - Backend Dockerfile
- `cicd/windows/build-all.ps1` - Local build script

### Docker Images:
- Backend: `mabouellais/aast-backend:deploy`
- Frontend: `mabouellais/aast-frontend:deploy`

### Ports:
- Backend: `5000`
- Frontend: `8000`

---

## 🐛 Troubleshooting

### GitHub Actions fails:
- Check secrets are set correctly
- Verify Docker Hub token is valid
- Check workflow logs in Actions tab

### Images not found:
- Make sure images were pushed to Docker Hub
- Check image names match exactly
- Verify you're logged into Docker Hub

### Build fails locally:
- Make sure Docker is running
- Check `backend/.env` exists (for backend build)
- Verify Node.js version matches (20.x)

### Docker Compose fails:
- Check `backend/.env` exists on server
- Verify ports 5000 and 8000 are available
- Check Docker daemon is running: `docker ps`

---

## ✅ Checklist

- [ ] GitHub secrets configured (DOCKER_HUB_USERNAME, DOCKER_HUB_TOKEN)
- [ ] `deploy` branch created and pushed
- [ ] GitHub Actions workflow runs successfully
- [ ] Images appear in Docker Hub
- [ ] Server has `backend/.env` file
- [ ] Docker Compose runs on server
- [ ] Services are accessible (backend:5000, frontend:8000)
- [ ] Caddy configured (if using reverse proxy)

---

**You're all set!** 🚀
