# Debug Backend Connection Issue

## 🔍 Check Backend Status

Run these commands on your VPS:

```bash
# 1. Check if backend container is running
docker ps | grep portfolio-backend

# 2. Check backend logs
docker logs portfolio-backend

# 3. Check if backend is responding
curl http://localhost:5002/api/health
# OR
curl http://localhost:5002/api/terms

# 4. Check backend environment variables
docker exec portfolio-backend env | grep -E "PORT|HOST|NODE_ENV"

# 5. Check if backend/.env exists and is loaded
docker exec portfolio-backend ls -la /app/.env
```

## ✅ Common Issues

### Issue 1: Backend not starting
**Symptoms:** No logs or error in logs
**Fix:**
```bash
docker logs portfolio-backend
# Check for database connection errors, missing .env, etc.
```

### Issue 2: Backend running but not accessible
**Symptoms:** Backend logs show "Server running" but curl fails
**Fix:**
```bash
# Check port mapping
docker ps | grep portfolio-backend
# Should show: 0.0.0.0:5002->5000/tcp

# Test from inside container
docker exec portfolio-backend curl http://localhost:5000/api/health
```

### Issue 3: CORS error
**Symptoms:** Frontend loads but API calls fail with CORS error
**Fix:** Check backend/.env has:
```
CORS_ORIGIN=https://www.mahmoudhaisam.com
```

### Issue 4: Frontend can't reach backend
**Symptoms:** "Cannot connect to server" error
**Fix:** Check NEXT_PUBLIC_API_URL in docker-compose.yml is `/api`

---

## 🚀 Quick Debug Steps

```bash
# 1. Check both containers
docker ps

# 2. Check backend logs
docker logs portfolio-backend --tail 50

# 3. Check frontend logs
docker logs portfolio-frontend --tail 50

# 4. Test backend API
curl -v http://localhost:5002/api/health

# 5. Check network connectivity
docker network inspect portfolio_portfolio-network
```

---

## 🔧 If Backend Not Starting

```bash
# Check backend/.env exists
ls -la /portfolio/backend/.env

# Check backend/.env has required variables
cat /portfolio/backend/.env | grep -E "DB_|PORT|HOST"

# Restart backend
docker restart portfolio-backend

# Check logs again
docker logs portfolio-backend --follow
```
