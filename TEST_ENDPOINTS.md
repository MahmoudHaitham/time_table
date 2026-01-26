# Testing Backend Endpoints

## Direct Backend Access (Bypassing Caddy)

When testing the backend directly on the VPS (bypassing Caddy), use these endpoints:

```bash
# Health check (correct endpoint)
curl http://localhost:5002/health

# Test endpoint
curl http://localhost:5002/api/test

# CORS test endpoint
curl http://localhost:5002/api/cors-test
```

**Note:** The health endpoint is `/health` (not `/api/health`) when accessing the backend directly.

## Through Caddy (Production)

When accessing through Caddy at `www.mahmoudhaisam.com`, use:

```bash
# Health check (now works!)
curl https://www.mahmoudhaisam.com/api/health

# Test endpoint
curl https://www.mahmoudhaisam.com/api/test
```

**Note:** Both `/health` and `/api/health` endpoints are now available on the backend.

## Expected Responses

### `/health` endpoint:
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

### `/api/test` endpoint:
```json
{
  "success": true,
  "message": "Backend is reachable",
  "origin": "none",
  "timestamp": "2026-01-25T...",
  "headers": {
    "origin": null,
    "access-control-request-method": null,
    "access-control-request-headers": null
  }
}
```

## Troubleshooting

**Terminal display issues:** If curl output appears garbled in your terminal (like `"upthttp://localhost:5002/api/test:"`), this is just a terminal display issue. The actual JSON response is correct. You can pipe to `jq` for better formatting:
```bash
curl http://localhost:5002/health | jq
```

**404 errors:** If `/api/health` returns 404, make sure you've rebuilt and redeployed the backend with the latest changes that include the `/api/health` endpoint.

## Summary

- **Direct backend access:** Use `/health` (port 5002)
- **Through Caddy:** Use `/api/health` (Caddy handles the routing)
- **Frontend:** Accessible at `http://localhost:8001` or `https://www.mahmoudhaisam.com`
