# Local vs Production Configuration

## Local Testing (Windows/Mac)

Use `docker-compose.yml`:
- Frontend: `http://localhost:8000`
- Backend: `http://localhost:5000`
- `NEXT_PUBLIC_API_URL: http://localhost:5000`

```bash
docker compose up
```

## Production (VPS)

Use `docker-compose.prod.yml`:
- Frontend: `http://localhost:8001` (proxied by Caddy)
- Backend: `http://localhost:5002` (proxied by Caddy)
- `NEXT_PUBLIC_API_URL: /api` (relative path for Caddy)

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Quick Switch

**For local testing:**
```bash
docker compose up
```

**For production:**
```bash
docker compose -f docker-compose.prod.yml up -d
```
