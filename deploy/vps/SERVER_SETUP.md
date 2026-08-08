# Copy everything in deploy/vps/ to the VPS in one command (run from project root on Windows):

```powershell
cd "C:\Users\Mahmoud Hitham\Desktop\Potfolio"

# Replace YOUR_VPS_IP with your server IP
$VPS = "root@YOUR_VPS_IP"

scp deploy/vps/docker-compose.yml          ${VPS}:/root/portfolio/docker-compose.yml
scp deploy/vps/root.env.template          ${VPS}:/root/portfolio/.env
scp deploy/vps/backend.env.template       ${VPS}:/root/portfolio/backend/.env
scp deploy/vps/cicd/deployment/05-deploy-app.sh       ${VPS}:/root/portfolio/cicd/deployment/
scp deploy/vps/cicd/deployment/06-restore-database.sh ${VPS}:/root/portfolio/cicd/deployment/
scp deploy/vps/cicd/deployment/check-status.sh        ${VPS}:/root/portfolio/cicd/deployment/
scp "C:\Users\Mahmoud Hitham\Downloads\assignments\terms.sql" ${VPS}:/root/portfolio/terms.sql
```

---

# VPS Server Setup — Step by Step

Everything you need is in the **`deploy/vps/`** folder on your PC.

## Files to copy to VPS

| File on your PC | Copy to on VPS |
|-----------------|----------------|
| `deploy/vps/docker-compose.yml` | `/root/portfolio/docker-compose.yml` |
| `deploy/vps/root.env.template` | `/root/portfolio/.env` |
| `deploy/vps/backend.env.template` | `/root/portfolio/backend/.env` |
| `deploy/vps/cicd/deployment/*.sh` | `/root/portfolio/cicd/deployment/` |
| `terms.sql` (your dump) | `/root/portfolio/terms.sql` |

---

## Step 1 — Upload files from Windows (PowerShell)

Open PowerShell on your PC:

```powershell
cd "C:\Users\Mahmoud Hitham\Desktop\Potfolio"
```

Replace `YOUR_VPS_IP` with your real IP, then run:

```powershell
$VPS = "root@YOUR_VPS_IP"

ssh $VPS "mkdir -p /root/portfolio/backend /root/portfolio/cicd/deployment"

scp deploy/vps/docker-compose.yml          ${VPS}:/root/portfolio/docker-compose.yml
scp deploy/vps/root.env.template          ${VPS}:/root/portfolio/.env
scp deploy/vps/backend.env.template       ${VPS}:/root/portfolio/backend/.env
scp deploy/vps/cicd/deployment/05-deploy-app.sh       ${VPS}:/root/portfolio/cicd/deployment/
scp deploy/vps/cicd/deployment/06-restore-database.sh ${VPS}:/root/portfolio/cicd/deployment/
scp deploy/vps/cicd/deployment/check-status.sh        ${VPS}:/root/portfolio/cicd/deployment/
scp "C:\Users\Mahmoud Hitham\Downloads\assignments\terms.sql" ${VPS}:/root/portfolio/terms.sql
```

---

## Step 2 — SSH into VPS

```bash
ssh root@YOUR_VPS_IP
cd /root/portfolio
```

---

## Step 3 — Verify all files are present

```bash
ls -la
ls -la backend/
ls -la cicd/deployment/
```

You must see:

```
/root/portfolio/
├── .env                    ← Postgres credentials
├── docker-compose.yml      ← db + backend + frontend
├── terms.sql               ← your database dump
├── backend/
│   └── .env                ← app config (DB_HOST=db)
└── cicd/deployment/
    ├── 05-deploy-app.sh
    ├── 06-restore-database.sh
    └── check-status.sh
```

Quick check:

```bash
grep "DB_HOST" backend/.env          # must show: DB_HOST=db
grep "postgres:17" docker-compose.yml # must show postgres:17
grep "POSTGRES_PASSWORD" .env        # must show password
```

Password in **both** `.env` and `backend/.env` must be identical:
`TtDb_2026_Vps_Secure_xK9m` (change both if you want a different one).

---

## Step 4 — Make scripts executable

```bash
chmod +x /root/portfolio/cicd/deployment/*.sh
```

---

## Step 5 — Stop old containers (if running)

```bash
cd /root/portfolio
docker compose down
```

---

## Step 6 — First deploy (starts Postgres + app)

```bash
cd /root/portfolio
bash cicd/deployment/05-deploy-app.sh
```

Expected output:
- Pulls `timetable-backend:deploy` and `timetable-frontend:deploy`
- Starts `portfolio-db` and waits until healthy
- Warning: **Database is empty** — that is normal on first run

---

## Step 7 — Import terms.sql (one time only)

```bash
cd /root/portfolio
bash cicd/deployment/06-restore-database.sh
```

Takes 1–2 minutes. At the end you should see table list and row counts for `terms`, `users`, `sessions`.

---

## Step 8 — Verify everything works

```bash
bash cicd/deployment/check-status.sh
docker compose ps
curl -s http://localhost:5002 | head -5
curl -s http://localhost:8001 | head -5
```

All 3 containers should be **Up (healthy)**:
- `portfolio-db`
- `portfolio-backend`
- `portfolio-frontend`

Test your site: https://www.mahmoudhaisam.com

---

## Future updates (after first setup)

When you push new code to the `deploy` branch on GitHub:

```bash
# On VPS — pull new images and restart (DB data is NOT touched)
cd /root/portfolio
bash cicd/deployment/05-deploy-app.sh
```

---

## Troubleshooting

**Error: `Set POSTGRES_PASSWORD in .env`**
→ Root `.env` is missing. Re-upload `root.env.template` as `/root/portfolio/.env`.

**Backend can't connect to database**
→ Check `backend/.env` has `DB_HOST=db` (NOT neon.tech, NOT localhost).

**Restore skipped — database already has tables**
→ Normal if you already imported. To re-import: `FORCE_RESTORE=1 bash cicd/deployment/06-restore-database.sh`

**View logs**
```bash
docker compose logs -f backend
docker compose logs -f db
```

**Database shell**
```bash
docker compose exec db psql -U timetable_admin -d timetable_db
```

---

## Password reference (must match in both files)

| File | Key | Value |
|------|-----|-------|
| `/root/portfolio/.env` | `POSTGRES_PASSWORD` | `TtDb_2026_Vps_Secure_xK9m` |
| `/root/portfolio/backend/.env` | `DB_PASSWORD` | `TtDb_2026_Vps_Secure_xK9m` |

Change both together if you want a different password.
