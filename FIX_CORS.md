# Fix CORS Configuration

## 🔍 Issue Found

Backend CORS is configured for `http://localhost:8000` but frontend is accessed via `https://www.mahmoudhaisam.com`

## ✅ Solution

Update `backend/.env` on your VPS:

```bash
cd /portfolio/backend
nano .env
```

Add or update:
```env
CORS_ORIGIN=https://www.mahmoudhaisam.com,https://mahmoudhaisam.com
```

Or if you want to allow both localhost (for testing) and production:
```env
CORS_ORIGIN=https://www.mahmoudhaisam.com,https://mahmoudhaisam.com,http://localhost:8000
```

## 🔄 Restart Backend

After updating .env:
```bash
docker restart portfolio-backend

# Check logs to verify CORS updated
docker logs portfolio-backend | grep CORS
```

## ✅ Verify

```bash
# Test from browser console or:
curl -H "Origin: https://www.mahmoudhaisam.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:5002/api/terms
```

You should see CORS headers in the response.
