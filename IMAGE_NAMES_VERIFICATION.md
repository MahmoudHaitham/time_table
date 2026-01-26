# Image Names Verification - timetable-backend & timetable-frontend ONLY

## ✅ All Files Updated

### Docker Compose
- ✅ `docker-compose.yml` → `mabouellais/timetable-backend:deploy` & `mabouellais/timetable-frontend:deploy`

### GitHub Actions
- ✅ `.github/workflows/docker-build-push.yml` → All references updated to `timetable-backend` & `timetable-frontend`

### Windows Build Scripts
- ✅ `cicd/windows/build-backend.ps1` → `mabouellais/timetable-backend:deploy`
- ✅ `cicd/windows/build-frontend.ps1` → `mabouellais/timetable-frontend:deploy`
- ✅ `cicd/windows/build-all.ps1` → Calls updated scripts
- ✅ `cicd/windows/docker-login.ps1` → No image names (login only)

### Linux Build Scripts
- ✅ `cicd/linux/build-backend.sh` → `mabouellais/timetable-backend:deploy`
- ✅ `cicd/linux/build-frontend.sh` → `mabouellais/timetable-frontend:deploy`
- ✅ `cicd/linux/build-all.sh` → Calls updated scripts
- ✅ `cicd/linux/docker-login.sh` → No image names (login only)

### Dockerfiles
- ✅ `Dockerfile` (frontend) → No image references (uses FROM node:20-alpine)
- ✅ `backend/Dockerfile` → No image references (uses FROM node:20-alpine)

---

## 🔍 Verification Commands

### Check for any remaining "aast" references:
```powershell
# Windows
Get-ChildItem -Recurse -Include *.ps1,*.sh,*.yml,*.yaml,Dockerfile | Select-String -Pattern "aast" -CaseSensitive:$false

# Linux
grep -r "aast" --include="*.sh" --include="*.yml" --include="*.yaml" --include="Dockerfile" .
```

### Verify images after build:
```bash
docker images | grep timetable
```

Should show:
- `mabouellais/timetable-backend:deploy`
- `mabouellais/timetable-frontend:deploy`

**NO** `aast-backend` or `aast-frontend` should appear!

---

## 🚨 If You See "Mounted from aast-frontend"

**This is NORMAL and SAFE!** 

Docker is reusing cached layers from your old `aast-*` images. This is actually **good** because:
- ✅ Saves build time
- ✅ Saves disk space
- ✅ The final image is still pushed as `timetable-frontend` (correct name)
- ✅ Your old `aast-*` images remain untouched for your other project

**You don't need to do anything!** The "Mounted from" message is just informational.

---

## ✅ Final Checklist

- [x] docker-compose.yml updated
- [x] GitHub Actions workflow updated
- [x] All Windows build scripts updated
- [x] All Linux build scripts updated
- [x] No "aast" references in any build/config files
- [x] New images built with correct names (`timetable-backend`, `timetable-frontend`)
- [x] Old images kept for other project (no need to remove)

---

**All image names are now `timetable-backend` and `timetable-frontend` ONLY!** ✅
