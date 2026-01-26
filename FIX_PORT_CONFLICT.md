# Fix Port 5000 Already Allocated Error

## 🔍 Check What's Using Port 5000

Run on your VPS:
```bash
# Check what's using port 5000
sudo lsof -i :5000
# OR
sudo netstat -tulpn | grep 5000
# OR
sudo ss -tulpn | grep 5000
```

## ✅ Solution Options

### Option 1: Stop Conflicting Service (Recommended)

If it's an old/existing backend container:
```bash
# List all containers (including stopped)
docker ps -a

# Stop the conflicting container
docker stop <container-name-or-id>
docker rm <container-name-or-id>

# Or stop all containers
docker stop $(docker ps -aq)

# Then start your services
cd /portfolio
docker compose up -d
```

### Option 2: Change Port Mapping

If you need to keep the existing service on 5000, change docker-compose.yml:

```yaml
services:
  backend:
    ports:
      - "5001:5000"  # Map host port 5001 to container port 5000
```

Then update Caddyfile:
```caddy
mahmoudhaisam.com, www.mahmoudhaisam.com {
    reverse_proxy /api/* localhost:5001  # Changed from 5000 to 5001
    reverse_proxy localhost:8000
}
```

### Option 3: Use Existing Backend

If the existing service on 5000 is your backend, just update Caddyfile to point to it and only run frontend:

```yaml
# docker-compose.yml - Only frontend
services:
  frontend:
    image: mabouellais/timetable-frontend:deploy
    container_name: portfolio-frontend
    environment:
      NODE_ENV: production
      API_URL: http://host.docker.internal:5000
      NEXT_PUBLIC_API_URL: /api
    ports:
      - "8000:8000"
    restart: unless-stopped
```

---

## 🚀 Quick Fix (Most Likely)

```bash
# Stop all Docker containers
docker stop $(docker ps -aq)

# Remove old containers
docker rm $(docker ps -aq)

# Start fresh
cd /portfolio
docker compose up -d
```

---

## 🔍 Check Current Containers

```bash
# See what's running
docker ps

# See all containers (including stopped)
docker ps -a

# Check Docker networks
docker network ls
```
