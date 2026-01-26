# Fix Port 8000 Already in Use

## 🔍 Check What's Using Port 8000

Run on your VPS:
```bash
sudo lsof -i :8000
# OR
sudo netstat -tulpn | grep 8000
# OR
sudo ss -tulpn | grep 8000
```

## ✅ Solution Options

### Option 1: Stop Conflicting Service (Recommended)

```bash
# Check what's using port 8000
docker ps | grep 8000

# Stop all containers
docker stop $(docker ps -aq)

# Remove old containers
docker rm $(docker ps -aq)

# Start your services
cd /portfolio
docker compose up -d
```

### Option 2: Change Frontend Port Mapping

If you need to keep something on 8000, change docker-compose.yml:

```yaml
frontend:
  ports:
    - "8001:8000"  # Map host port 8001 to container port 8000
```

Then update Caddyfile:
```caddy
reverse_proxy localhost:8001  # Changed from 8000 to 8001
```

---

## 🚀 Quick Fix

```bash
# Stop all containers
docker stop $(docker ps -aq) 2>/dev/null || true

# Remove old containers  
docker rm $(docker ps -aq) 2>/dev/null || true

# Start fresh
cd /portfolio
docker compose up -d
```
