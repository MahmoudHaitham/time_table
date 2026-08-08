# University Timetable Management System — Project README

> **This file mirrors the main project README.** The canonical version lives at the repository root: **[../README.md](../README.md)**

**[Live Production](https://www.mahmoudhaisam.com)** | [Full Documentation](../docs/SYSTEM_DOCUMENTATION.md) | [Test Suite](#automated-test-suite)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Scale & Statistics](#platform-scale--statistics)
3. [System Architecture](#system-architecture)
4. [User Roles & Access Model](#user-roles--access-model)
5. [Authentication & Security](#authentication--security)
6. [Portfolio & Public Pages](#portfolio--public-pages)
7. [Admin Portal](#admin-portal)
8. [Student Timetable Generator](#student-timetable-generator)
9. [Backend API & Database](#backend-api--database)
10. [Technology Stack](#technology-stack)
11. [Getting Started](#getting-started)
12. [Docker & Production Deployment](#docker--production-deployment)
13. [Automated Test Suite](#automated-test-suite)
14. [Documentation Index](#documentation-index)
15. [Author & License](#author--license)

---

## Executive Summary

**Potfolio** is a production-deployed monorepo combining a personal developer portfolio with a **University Timetable Management System** — admin CRUD, student schedule generation for credit systems 140/160/180, hierarchical templates, and Docker-based VPS deployment.

**Production URL:** [https://www.mahmoudhaisam.com](https://www.mahmoudhaisam.com)

| Domain | Capability |
|--------|------------|
| **Administration** | Terms, classes, courses, sessions, templates, instructors, rooms |
| **Schedule Generation** | Conflict-free combinatorial engine with caching |
| **Student Portal** | Public schedule builder + PDF export |
| **Infrastructure** | PostgreSQL 17, Docker Compose, Caddy, GitHub Actions |

---

## Platform Scale & Statistics

| Metric | Count |
|--------|-------|
| Frontend pages | 28 |
| Backend controllers | 12+ |
| Database entities | 12 |
| REST API endpoints | 60+ |
| Live screenshots | 158 (multi-section) |
| Published terms | 8 |
| Sessions in DB | 587+ |

---

## System Architecture

```mermaid
flowchart TB
    Browser["Browser"] --> Caddy["Caddy HTTPS"]
    Caddy -->|"/api/*"| BE["Backend :5002"]
    Caddy -->|"/*"| FE["Frontend :8001"]
    BE --> DB[("PostgreSQL 17")]
```

| Path | Handler |
|------|---------|
| `https://www.mahmoudhaisam.com/api/*` | Backend (Express) |
| `https://www.mahmoudhaisam.com/*` | Frontend (Next.js) |

![Admin Dashboard](../docs/screenshots/admin/admin-timetable.png)

---

## User Roles & Access Model

| Role | Path | Access |
|------|------|--------|
| **Admin** | `/admin/*` | Full timetable management |
| **Student** | `/student/*` | Public schedule generator |
| **Public** | `/`, `/problem` | Portfolio, problem reports |

![Login Page](../docs/screenshots/public/01-login.png)

---

## Authentication & Security

- **JWT:** 15-min access + 7-day refresh (httpOnly cookie)
- **CSRF:** Required on admin mutations
- **Term tokens:** HMAC-SHA256 obfuscation for student URLs
- **Rate limiting:** Login, API, timetable, generation endpoints
- **Headers:** CSP, HSTS, X-Frame-Options via Caddy + middleware

---

## Portfolio & Public Pages

| Route | Screenshot |
|-------|------------|
| `/` — Portfolio | ![Portfolio](../docs/screenshots/public/home-portfolio.png) |
| `/login` — Admin login | ![Login](../docs/screenshots/public/01-login.png) |
| `/problem` — Report problem | ![Problem](../docs/screenshots/public/public-problem.png) |
| `/timetable` — Legacy view | ![Legacy](../docs/screenshots/public/legacy-timetable.png) |

---

## Admin Portal

| Route | Page | Screenshot |
|-------|------|------------|
| `/admin/timetable` | Dashboard | ![Dashboard](../docs/screenshots/admin/admin-timetable.png) |
| `/admin/timetable/courses` | Courses | ![Courses](../docs/screenshots/admin/admin-courses.png) |
| `/admin/timetable/instructors` | Instructors | ![Instructors](../docs/screenshots/admin/admin-instructors.png) |
| `/admin/timetable/templates` | Templates | ![Templates](../docs/screenshots/admin/admin-templates.png) |
| `/admin/timetable/coursesForOtherDept` | Other Depts | ![Other](../docs/screenshots/admin/admin-other-dept.png) |
| `/admin/room-schedule` | Room Schedule | ![Rooms](../docs/screenshots/admin/admin-room-schedule.png) |
| `/admin/timetable/generation-logs` | Gen Logs | ![Logs](../docs/screenshots/admin/admin-generation-logs.png) |
| `/admin/problems` | Problems | ![Problems](../docs/screenshots/admin/admin-problems.png) |
| `/admin/all_instructors` | All Instructors | ![All](../docs/screenshots/admin/admin-all-instructors.png) |
| `/admin/timetable/terms/4` | Term Detail | ![Term](../docs/screenshots/admin/admin-term-4.png) |
| `/admin/timetable/classes/1` | Class Editor | ![Class](../docs/screenshots/admin/admin-class-detail.png) |

---

## Student Timetable Generator

| Route | Screenshot |
|-------|------------|
| `/student/timetable` | ![Home](../docs/screenshots/student/student-home.png) |
| `/student/timetable/system/140` | ![140](../docs/screenshots/student/student-system-140.png) |
| `/student/timetable/system/160` | ![160](../docs/screenshots/student/student-system-160.png) |
| `/student/timetable/system/180` | ![180](../docs/screenshots/student/student-system-180.png) |
| Term 4 preferences (System 140) | ![Prefs](../docs/screenshots/student/student-term4-system140.png) |
| Generated schedules | ![Schedules](../docs/screenshots/student/student-term4-schedules.png) |
| `/student/timetable/other` | ![Other](../docs/screenshots/student/student-other.png) |
| `/student/timetable/4/all-classes` | ![All Classes](../docs/screenshots/student/student-all-classes-term4.png) |
| `/student/manual` | ![Manual](../docs/screenshots/student/student-manual.png) |

---

## Backend API & Database

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/timetable/terms` | Published terms |
| POST | `/api/timetable/generate` | Generate schedules |
| POST | `/api/auth/login` | Admin login |
| GET | `/api/health` | Health check |

### Database (12 Tables)

`users`, `terms`, `classes`, `courses`, `class_courses`, `course_components`, `sessions`, `electives_allowed`, `schedule_cache`, `schedule_templates`, `generation_logs`, `student_problems`

Full ERD: [docs/SYSTEM_DOCUMENTATION.md](../docs/SYSTEM_DOCUMENTATION.md)

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 18, Tailwind, Framer Motion |
| Backend | Express 5, TypeORM, Node.js 20 |
| Database | PostgreSQL 17 |
| Deploy | Docker Compose, Caddy, GitHub Actions |

---

## Getting Started

```bash
# Backend
cd backend && npm install && npm run dev    # :5000

# Frontend
npm install && npm run dev                  # :8000
```

See [../README.md](../README.md#getting-started) for full setup with environment variables.

---

## Docker & Production Deployment

```bash
cd /root/portfolio
bash cicd/deployment/05-deploy-app.sh
```

| Service | Container | Port |
|---------|-----------|------|
| Database | `portfolio-db` | internal |
| Backend | `portfolio-backend` | 5002 |
| Frontend | `portfolio-frontend` | 8001 |

Guide: [deploy/vps/SERVER_SETUP.md](../deploy/vps/SERVER_SETUP.md)

---

## Automated Test Suite

This directory contains automated tests for the Timetable Management System.

### Setup

```bash
cd tests
npm install
```

### Configuration

Create `tests/.env`:

```env
API_BASE_URL=http://localhost:5000/api
FRONTEND_URL=http://localhost:8000
TEST_ADMIN_REG=00000
TEST_ADMIN_PASS=your_test_password
TEST_TERM_ID=4
TEST_SYSTEM_TYPE=140
```

### Running Tests

```bash
npm test                  # All tests
npm run test:auth         # Authentication
npm run test:api          # API security
npm run test:performance  # Performance
npm run test:e2e          # Playwright E2E
npm run security-scan     # Security headers
```

### Test Coverage

| Suite | Status | Test Cases |
|-------|--------|------------|
| Authentication | ✅ Automated | TC-AUTH-001 to TC-AUTH-019 |
| Authorization | ✅ Automated | TC-AUTHZ-001 to TC-AUTHZ-014 |
| API Security | ✅ Automated | TC-API-001 to TC-API-012 |
| CSRF Protection | ✅ Automated | TC-CSRF-001 to TC-CSRF-005 |
| Error Handling | ✅ Automated | TC-ERROR-001 to TC-ERROR-006 |
| Performance | ✅ Automated | TC-PERF-001 to TC-PERF-006 |
| Visual/UI | ⚠️ Manual | PDF layout, colors |

### Test Structure

```
tests/
├── auth.test.ts
├── authorization.test.ts
├── api-security.test.ts
├── csrf.test.ts
├── error-handling.test.ts
├── performance.test.ts
├── config.ts
├── utils/api-client.ts
├── load/load-test.yml
└── security/security-scan.js
```

### CI Integration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd tests && npm install && npm test
```

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [../README.md](../README.md) | **Main project README** (this content, full version) |
| [../docs/SYSTEM_DOCUMENTATION.md](../docs/SYSTEM_DOCUMENTATION.md) | Complete technical reference |
| [../deploy/vps/SERVER_SETUP.md](../deploy/vps/SERVER_SETUP.md) | VPS setup |
| [../backend/README.md](../backend/README.md) | Backend quick start |

---

## Author & License

**Author:** Mahmoud Haisam Mohammed

- GitHub: [@MahmoudHaitham](https://github.com/MahmoudHaitham)
- Production: [www.mahmoudhaisam.com](https://www.mahmoudhaisam.com)

**License:** MIT

---

University Timetable Management System — Built for academic schedule management
