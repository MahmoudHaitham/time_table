# Minimal VPS Upload - Option 1 (Recommended)

## ✅ If Using Pre-built Images from Docker Hub

**You DON'T need backend source code!** Just upload:

### Files to Upload:
1. `docker-compose.prod.yml` → rename to `docker-compose.yml` on VPS
2. `Caddyfile` → copy to `/etc/caddy/Caddyfile`

### Create Manually on VPS:
1. `/portfolio/backend/.env` - Backend environment variables
2. `/portfolio/cicd/.env` - Docker Hub credentials (only if building on VPS)

### Deploy:
```bash
cd /portfolio
docker-compose pull  # Pull images from Docker Hub
docker-compose up -d
```

---

# Full VPS Upload - Option 2 (If Building on VPS)

## ✅ If Building Images on VPS

Upload these backend files only:

### Required Backend Files:
```
backend/
├── src/                    ✅ Upload (all source code)
├── package.json            ✅ Upload
├── package-lock.json      ✅ Upload
├── tsconfig.json           ✅ Upload
├── Dockerfile              ✅ Upload
└── .dockerignore          ✅ Upload
```

### Skip These (not needed):
- ❌ `backend/.env` - Create manually on VPS
- ❌ `backend/node_modules/` - Installed during Docker build
- ❌ `backend/dist/` - Built during Docker build
- ❌ `backend/*.md` - Documentation files
- ❌ `backend/backend/` - Nested folder (if exists)

---

## 🎯 Recommendation

**Use Option 1** - Pull images from Docker Hub:
- ✅ Faster deployment
- ✅ No source code on server
- ✅ Uses your CI/CD pipeline
- ✅ Easier updates (just pull new images)

**Only use Option 2** if:
- You want to build on VPS
- You don't have Docker Hub access
- You need to modify code directly on server

---

## Quick Upload (Option 1 - Recommended)

```bash
# Upload only docker-compose and Caddyfile
scp docker-compose.prod.yml user@vps:/portfolio/docker-compose.yml
scp Caddyfile user@vps:/tmp/Caddyfile

# On VPS: Create backend/.env manually, then:
cd /portfolio
docker-compose pull
docker-compose up -d
```

**That's it!** No backend source code needed. 🚀
