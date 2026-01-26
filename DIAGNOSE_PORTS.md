# Diagnose Port Issues - 502 Bad Gateway

## Step 1: Check if Containers are Running

```bash
cd ~/portfolio
docker ps
```

**Expected output:** Both `portfolio-backend` and `portfolio-frontend` should be running.

## Step 2: Check if Ports are Actually Bound

```bash
# Check backend port 5002
netstat -tuln | grep 5002
# OR
ss -tuln | grep 5002

# Check frontend port 8001
netstat -tuln | grep 8001
# OR
ss -tuln | grep 8001
```

**Expected:** Should show ports 5002 and 8001 are LISTENING.

## Step 3: Test Direct Connection to Services

```bash
# Test backend directly
curl http://localhost:5002/health

# Test frontend directly
curl http://localhost:8001
```

**Expected:** Backend should return JSON, frontend should return HTML.

## Step 4: Check Container Port Bindings

```bash
# Check backend container ports
docker port portfolio-backend

# Check frontend container ports
docker port portfolio-frontend
```

**Expected:**
- Backend: `5000/tcp -> 0.0.0.0:5002`
- Frontend: `8000/tcp -> 0.0.0.0:8001`

## Step 5: Check for Port Conflicts

```bash
# Check what's using ports 5002 and 8001
sudo lsof -i :5002
sudo lsof -i :8001
```

**Expected:** Should show docker-proxy or the containers using these ports.

## Step 6: Reload Caddy Configuration

```bash
# Reload Caddy (if using systemd)
sudo systemctl reload caddy

# OR if Caddy is running directly
sudo pkill -USR1 caddy

# OR restart Caddy
sudo systemctl restart caddy
```

## Step 7: Check Caddy Logs

```bash
# Check Caddy logs for errors
sudo journalctl -u caddy -n 50 --no-pager
# OR if Caddy runs directly
sudo tail -f /var/log/caddy/access.log
sudo tail -f /var/log/caddy/error.log
```

## Common Issues and Fixes

### Issue 1: Containers Not Running
```bash
cd ~/portfolio
docker compose up -d
docker compose ps
```

### Issue 2: Port Already in Use
```bash
# Find what's using the port
sudo lsof -i :5002
sudo lsof -i :8001

# Stop conflicting service or change ports
```

### Issue 3: Wrong Port Binding
```bash
# Restart containers to apply port changes
cd ~/portfolio
docker compose down
docker compose up -d
```

### Issue 4: Caddy Not Reloaded
```bash
# Reload Caddy after port changes
sudo systemctl reload caddy
```

## Quick Fix Script

Run this to check everything at once:

```bash
#!/bin/bash
echo "=== Checking Containers ==="
docker ps | grep portfolio

echo ""
echo "=== Checking Port Bindings ==="
docker port portfolio-backend 2>/dev/null || echo "Backend container not running"
docker port portfolio-frontend 2>/dev/null || echo "Frontend container not running"

echo ""
echo "=== Testing Direct Connections ==="
echo "Backend health:"
curl -s http://localhost:5002/health | head -c 100
echo ""
echo "Frontend:"
curl -s http://localhost:8001 | head -c 100
echo ""

echo ""
echo "=== Checking Port Usage ==="
sudo lsof -i :5002 2>/dev/null || echo "Port 5002 not in use"
sudo lsof -i :8001 2>/dev/null || echo "Port 8001 not in use"
```
