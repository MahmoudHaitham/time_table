# University Timetable Management System

Enterprise-grade full-stack academic timetable platform with admin portal, student schedule generator, and personal portfolio

**[Live Production](https://www.mahmoudhaisam.com)** | [Documentation](#table-of-contents)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Scale & Statistics](#platform-scale--statistics)
3. [System Architecture](#system-architecture)
4. [User Roles & Access Model](#user-roles--access-model)
5. [Authentication & Security](#authentication--security)
6. [Portfolio](#portfolio)
7. [Admin Portal](#admin-portal)
8. [Student Timetable Generator](#student-timetable-generator)
9. [Schedule Generation Engine](#schedule-generation-engine)
10. [Backend API & Services](#backend-api--services)
11. [Database Schema](#database-schema)
12. [Technology Stack](#technology-stack)
13. [Project Structure](#project-structure)
14. [Getting Started](#getting-started)
15. [Docker & Production Deployment](#docker--production-deployment)
16. [Testing](#testing)
17. [Documentation Index](#documentation-index)
18. [Author & License](#author--license)

---

## Executive Summary

**Potfolio** is a production-deployed monorepo that combines a personal developer portfolio with a **University Timetable Management System** — a full-stack platform for managing academic terms, classes, courses, sessions, and automated conflict-free schedule generation for credit systems 140, 160, and 180.

The timetable system is not a simple CRUD app. It is a **multi-portal academic platform** with hierarchical schedule templates, two-layer caching, HMAC-secured term tokens, generation audit logs, student problem reporting, and Docker-based VPS deployment with CI/CD.

**Production URL:** [https://www.mahmoudhaisam.com](https://www.mahmoudhaisam.com)

### What Makes This System Comprehensive

| Domain | Capability |
|--------|------------|
| **Administration** | Term CRUD, publish/validate, class & course management, session scheduling, instructor & room views |
| **Schedule Generation** | Combinatorial engine with conflict detection, elective/core exclusions, preferred instructors, campus track |
| **Templates** | Hierarchical parent/child pre-computed templates for instant student responses |
| **Student Portal** | Public schedule builder for systems 140/160/180, Other section, PDF export, all-classes view |
| **Caching** | In-memory (5 min TTL) + PostgreSQL schedule cache + template persistence |
| **Integrity** | JWT + CSRF, term ID obfuscation, rate limiting, generation audit logs |
| **Operations** | Student problem submission and admin triage workflow |
| **Infrastructure** | Docker Compose, PostgreSQL 17 on VPS, Caddy HTTPS, GitHub Actions CI/CD |

---

## Platform Scale & Statistics

| Metric | Count |
|--------|-------|
| Frontend pages (routes) | 28 |
| Backend controllers | 12+ |
| API route modules | 14 |
| Database entities / tables | 12 |
| REST API endpoints | 60+ |
| User roles | 2 (admin, student) |
| Admin portal pages | 12 |
| Credit systems supported | 3 (140, 160, 180) |
| Published terms (production) | 8 |
| Sessions in database | 587+ |

---

## System Architecture

The platform uses a **three-tier containerized architecture** deployed on a Hostinger VPS. The backend is an Express application with TypeORM, in-memory caching, and a combinatorial schedule generation engine.

```mermaid
flowchart TB
    subgraph Client["Client"]
        Browser["Browser — Student / Admin / Public"]
    end

    subgraph VPS["Production VPS"]
        Caddy["Caddy Reverse Proxy — HTTPS 443"]
        subgraph Docker["Docker Compose — portfolio-network"]
            FE["Frontend Container — Next.js 8000"]
            BE["Backend Container — Express 5000"]
            DB[("PostgreSQL 17 — port 5432 internal")]
        end
    end

    Browser -->|HTTPS| Caddy
    Caddy -->|"/api/*"| BE
    Caddy -->|"/*"| FE
    FE -->|API_URL internal| BE
    BE --> DB
```

### Request Routing

| Path | Handler |
|------|---------|
| `https://www.mahmoudhaisam.com/` | Caddy → Frontend (Next.js) |
| `https://www.mahmoudhaisam.com/api/*` | Caddy → Backend (Express REST) |
| `https://www.mahmoudhaisam.com/admin/*` | Caddy → Frontend (protected by middleware) |
| `https://www.mahmoudhaisam.com/student/*` | Caddy → Frontend (public) |

The frontend uses `NEXT_PUBLIC_API_URL=/api` so the browser sends API requests through Caddy — no cross-origin access to port 5002.

![System Architecture — Production Stack](./docs/screenshots/admin/admin-timetable.png)

### Application Layer Design

```mermaid
flowchart LR
    subgraph Presentation["Presentation Layer"]
        Pages["Next.js App Router — 28 pages"]
        Components["React Components + Radix UI"]
        APIClient["lib/api — auth.ts + timetable.ts"]
    end

    subgraph Application["Application Layer"]
        Routes["14 Express Route Modules"]
        Controllers["12+ Controllers"]
        Services["validationService, scheduleTemplateService"]
        Middleware["auth, csrf, rateLimiter"]
    end

    subgraph Persistence["Persistence Layer"]
        TypeORM["TypeORM Repositories"]
        Entities["12 Entity Models"]
        Postgres[("PostgreSQL 17")]
    end

    Pages --> APIClient
    APIClient --> Routes
    Routes --> Controllers
    Controllers --> Services
    Controllers --> TypeORM
    TypeORM --> Entities
    Entities --> Postgres
```

### Schedule Generation Sequence

```mermaid
sequenceDiagram
    participant S as Student Browser
    participant FE as Next.js Frontend
    participant API as Express /api/timetable
    participant Cache as Template + Memory Cache
    participant Engine as Schedule Engine
    participant DB as PostgreSQL

    S->>FE: Select term + preferences
    FE->>API: POST /api/timetable/generate
    API->>Cache: Lookup schedule_templates by hash

    alt Template hit
        Cache-->>API: Pre-computed schedules
    else Template miss
        API->>Engine: generateScheduleCombinations()
        Engine->>DB: Load classes, courses, sessions
        Engine->>Engine: Build conflict-free combinations
        Engine->>Cache: Save parent/child template
    end

    API->>DB: INSERT generation_logs
    API-->>FE: { schedules: [...] }
    FE-->>S: Display schedule grid + PDF export
```

### Deployment Topology

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        Users["Students / Admins / Public"]
    end

    subgraph VPSHost["VPS Host — /root/portfolio"]
        Caddy["Caddy — TLS 443"]
        subgraph Compose["Docker Compose"]
            FE["Frontend — host 8001"]
            BE["Backend — host 5002"]
            DB[("PostgreSQL — internal")]
        end
        PGVol["postgres_data volume"]
    end

    subgraph CI["GitHub Actions"]
        GHA["Build on deploy branch"]
        DH["Docker Hub"]
    end

    Users --> Caddy
    Caddy --> FE
    Caddy --> BE
    BE --> DB
    DB --> PGVol
    GHA --> DH
    DH --> Compose
```

---

## User Roles & Access Model

| Role | Portal Path | Access Level |
|------|-------------|--------------|
| **Admin** | `/admin/*` | Full CRUD: terms, classes, courses, sessions, templates, instructors, rooms, problems, logs |
| **Student** | `/student/*` | Public schedule generator — no login required |
| **Public** | `/`, `/problem`, `/timetable` | Portfolio, problem reports, legacy views |

### Portal Entry Flow

1. **Admin:** Navigate to `/login` → enter registration number + password → redirected to `/admin/timetable`
2. **Student:** Navigate to `/student/timetable` → select credit system → select term → configure preferences → generate schedules
3. **Public:** Portfolio at `/`, problem report at `/problem`

![Admin Login](./docs/screenshots/public/01-login.png)

---

## Authentication & Security

### JWT Authentication

- Access tokens expire after **15 minutes**; refresh tokens last **7 days** (httpOnly cookie)
- Tokens transmitted via `Authorization: Bearer` header
- Admin routes protected by `requireAuth` + `requireAdmin` (DB role re-check)
- Next.js `middleware.ts` guards `/admin/*` via `auth_token` cookie

### CSRF Protection

- Admin mutating routes require `X-CSRF-Token` header
- Token stored in `sessionStorage`, refreshed from response headers

### Term Token Security

Student-facing URLs use **HMAC-SHA256 encoded term tokens** instead of raw numeric IDs (`backend/src/utils/termToken.ts`).

### Rate Limiting

| Limiter | Limit | Routes |
|---------|-------|--------|
| login | 10 / 15 min | `/api/auth/login` |
| general | 100 / min | Default |
| timetable | 300 / min | `/api/timetable/*` |
| scheduleGeneration | 1000 / min | Generate endpoints |

### Security Headers

Caddy + Next.js middleware apply CSP, HSTS, X-Frame-Options, X-Content-Type-Options.

---

## Portfolio

**Route:** `/`

Personal developer portfolio showcasing skills, experience, projects, and contact information.

![Portfolio Home](./docs/screenshots/public/home-portfolio.png)

![Portfolio Home — Section 2](./docs/screenshots/public/home-portfolio-2.png)

![Portfolio Home — Section 3](./docs/screenshots/public/home-portfolio-3.png)

![Portfolio Home — Section 4](./docs/screenshots/public/home-portfolio-4.png)

![Portfolio Home — Section 5](./docs/screenshots/public/home-portfolio-5.png)

![Portfolio Home — Section 6](./docs/screenshots/public/home-portfolio-6.png)

---

## Admin Portal

The admin portal is scoped to timetable management with **12 dedicated pages**. Access requires authentication at `/login`.

### Dashboard — `/admin/timetable`

Main hub: term list (published/draft), navigation to all modules, Create Term, Logout.

![Admin Dashboard](./docs/screenshots/admin/admin-timetable.png)

### Term Detail — `/admin/timetable/terms/[id]`

Manage classes for a term, publish/unpublish, validate data integrity.

![Admin Term 4](./docs/screenshots/admin/admin-term-4.png)

![Admin Term Other Departments](./docs/screenshots/admin/admin-term-other-dept.png)

### Class Editor — `/admin/timetable/classes/[id]`

Assign courses to class, manage L/S/LB components, schedule sessions (day, slot, room, instructor).

![Admin Class Detail](./docs/screenshots/admin/admin-class-detail.png)

### Courses — `/admin/timetable/courses`

Course catalog CRUD with component types and elective flags.

![Admin Courses](./docs/screenshots/admin/admin-courses.png)

![Admin Courses — Section 2](./docs/screenshots/admin/admin-courses-2.png)

![Admin Courses — Section 3](./docs/screenshots/admin/admin-courses-3.png)

### Instructors — `/admin/timetable/instructors`

Instructor schedule grid per term.

![Admin Instructors](./docs/screenshots/admin/admin-instructors.png)

### Templates — `/admin/timetable/templates`

Pre-generate hierarchical schedule templates, invalidate, cleanup.

![Admin Templates](./docs/screenshots/admin/admin-templates.png)

### Other Departments — `/admin/timetable/coursesForOtherDept`

Manage courses for non-standard departments.

![Admin Other Dept](./docs/screenshots/admin/admin-other-dept.png)

### Room Schedule — `/admin/room-schedule`

Room occupancy grid across all sessions.

![Admin Room Schedule](./docs/screenshots/admin/admin-room-schedule.png)

![Admin Room Schedule — Section 2](./docs/screenshots/admin/admin-room-schedule-2.png)

![Admin Room Schedule — Section 3](./docs/screenshots/admin/admin-room-schedule-3.png)

### Generation Logs — `/admin/timetable/generation-logs`

Audit trail of all student schedule generations.

![Admin Generation Logs](./docs/screenshots/admin/admin-generation-logs.png)

![Admin Generation Logs — Section 2](./docs/screenshots/admin/admin-generation-logs-2.png)

![Admin Generation Logs — Section 3](./docs/screenshots/admin/admin-generation-logs-3.png)

![Admin Generation Logs — Section 4](./docs/screenshots/admin/admin-generation-logs-4.png)

![Admin Generation Logs — Section 5](./docs/screenshots/admin/admin-generation-logs-5.png)

### Student Problems — `/admin/problems`

Triage student-reported issues (pending → solved / not_solved).

![Admin Problems](./docs/screenshots/admin/admin-problems.png)

### All Instructors — `/admin/all_instructors`

Overview of all instructors across terms.

![Admin All Instructors](./docs/screenshots/admin/admin-all-instructors.png)

![Admin All Instructors — Section 2](./docs/screenshots/admin/admin-all-instructors-2.png)

![Admin All Instructors — Section 3](./docs/screenshots/admin/admin-all-instructors-3.png)

![Admin All Instructors — Section 4](./docs/screenshots/admin/admin-all-instructors-4.png)

![Admin All Instructors — Section 5](./docs/screenshots/admin/admin-all-instructors-5.png)

![Admin All Instructors — Section 6](./docs/screenshots/admin/admin-all-instructors-6.png)

![Admin All Instructors — Section 7](./docs/screenshots/admin/admin-all-instructors-7.png)

![Admin All Instructors — Horizontal pan](./docs/screenshots/admin/admin-all-instructors-8.png)

![Admin All Instructors — Horizontal pan 2](./docs/screenshots/admin/admin-all-instructors-9.png)

---

## Student Timetable Generator

Public-facing schedule builder — **no login required**.

### System Picker — `/student/timetable`

Choose credit system (140 / 160 / 180) or Other section.

![Student Home](./docs/screenshots/student/student-home.png)

### System Term Lists

| Route | Screenshot |
|-------|------------|
| `/student/timetable/system/140` | ![System 140](./docs/screenshots/student/student-system-140.png) |
| `/student/timetable/system/160` | ![System 160](./docs/screenshots/student/student-system-160.png) |
| `/student/timetable/system/180` | ![System 180](./docs/screenshots/student/student-system-180.png) |

### Term Preferences — `/student/timetable/system/[systemType]/[termToken]`

Course selection, excluded days, electives, instructors, campus track (Term 4 System 140).

![Term 4 System 140 Preferences](./docs/screenshots/student/student-term4-system140.png)

### Generated Schedules — `.../schedules`

Schedule results grid with PDF export capability.

![Generated Schedules](./docs/screenshots/student/student-term4-schedules.png)

### Other Section — `/student/timetable/other`

Cross-term course selection for non-standard schedules.

![Other Section](./docs/screenshots/student/student-other.png)

![Other Schedules](./docs/screenshots/student/student-other-schedules.png)

### All Classes View — `/student/timetable/[termId]/all-classes`

View all class timetables for a term including Northampton-only classes.

![All Classes Term 4](./docs/screenshots/student/student-all-classes-term4.png)

![All Classes Term 4 — Section 2](./docs/screenshots/student/student-all-classes-term4-2.png)

![All Classes Term 4 — Section 3](./docs/screenshots/student/student-all-classes-term4-3.png)

![All Classes Term 4 — Section 4](./docs/screenshots/student/student-all-classes-term4-4.png)

### Additional Student Pages

| Route | Description | Screenshot |
|-------|-------------|------------|
| `/student/manual` | User manual | ![Manual](./docs/screenshots/student/student-manual.png) |
| `/student/timetable/electives` | Electives view | ![Electives](./docs/screenshots/student/student-electives.png) |
| `/problem` | Report a problem | ![Problem](./docs/screenshots/public/public-problem.png) |

![Student Manual — Section 2](./docs/screenshots/student/student-manual-2.png)

![Student Manual — Section 3](./docs/screenshots/student/student-manual-3.png)

![Student Manual — Section 4](./docs/screenshots/student/student-manual-4.png)

![Student Manual — Section 5](./docs/screenshots/student/student-manual-5.png)

![Student Manual — Section 6](./docs/screenshots/student/student-manual-6.png)

---

## Schedule Generation Engine

Located in `backend/src/controllers/timetableViewController.ts` (~4300 lines).

### Hierarchical Template System

```mermaid
flowchart TD
    A[Student requests schedules] --> B{excludedCore empty?}
    B -->|Yes| C[Lookup PARENT template]
    B -->|No| D[Lookup CHILD template]
    D -->|Found| E[Return filtered schedules]
    D -->|Not found| F[Filter from parent → save child]
    C --> I{Template exists?}
    I -->|Yes| E
    I -->|No| J[Generate all combinations → save parent]
    E --> L[Apply runtime filters: days, instructors, campus]
```

### Caching Layers

| Layer | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| In-memory | Node.js Map | 5 min | Published terms, timetables |
| PostgreSQL | `schedule_cache` | Persistent | Generated schedules by preference hash |
| PostgreSQL | `schedule_templates` | Persistent | Pre-computed combinations |

---

## Backend API & Services

### Controller Summary

| Controller | Domain |
|------------|--------|
| `timetableViewController` | Schedule generation, public timetable views |
| `scheduleTemplateController` | Template admin operations |
| `termController` | Term CRUD, publish, validate |
| `sessionController` | Session CRUD |
| `authController` | Login, register, refresh, logout |
| `studentProblemController` | Problem reports |
| `generationLogController` | Generation audit |
| `classCourseController` | Class-course assignments, closure |
| `courseController` | Course catalog |
| `otherDeptController` | Other department courses |
| `validationService` | Pre-publish validation |
| `scheduleTemplateService` | Template lookup/save |

### Key Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/timetable/terms` | Published terms |
| POST | `/api/timetable/generate` | Generate schedules |
| POST | `/api/problems` | Submit problem |
| GET | `/api/health` | Health check |

Full API reference: [docs/SYSTEM_DOCUMENTATION.md](./docs/SYSTEM_DOCUMENTATION.md)

---

## Database Schema

PostgreSQL 17 with **12 TypeORM entities**:

| Entity | Table | Purpose |
|--------|-------|---------|
| `User` | `users` | Admin/student accounts |
| `Term` | `terms` | Academic terms |
| `Class` | `classes` | Classes per term + system type |
| `Course` | `courses` | Course catalog |
| `ClassCourse` | `class_courses` | Course-class join (+ `closed` flag) |
| `CourseComponent` | `course_components` | L / S / LB components |
| `Session` | `sessions` | Scheduled slots |
| `ElectivesAllowed` | `electives_allowed` | Allowed electives per term |
| `ScheduleCache` | `schedule_cache` | DB schedule cache |
| `ScheduleTemplate` | `schedule_templates` | Hierarchical templates |
| `GenerationLog` | `generation_logs` | Generation audit |
| `StudentProblem` | `student_problems` | Problem reports |

### Entity-Relationship Diagram

```mermaid
erDiagram
    TERMS ||--o{ CLASSES : contains
    TERMS ||--o{ ELECTIVES_ALLOWED : allows
    TERMS ||--o{ SCHEDULE_CACHE : caches
    TERMS ||--o{ SCHEDULE_TEMPLATES : templates
    CLASSES ||--o{ CLASS_COURSES : assigns
    COURSES ||--o{ CLASS_COURSES : assigned_to
    CLASS_COURSES ||--o{ COURSE_COMPONENTS : has
    COURSE_COMPONENTS ||--o{ SESSIONS : scheduled
    SCHEDULE_TEMPLATES ||--o{ SCHEDULE_TEMPLATES : parent_child

    TERMS {
        int id PK
        varchar term_number
        boolean is_published
    }

    CLASSES {
        int id PK
        int term_id FK
        varchar class_code
        int system_type
    }

    SESSIONS {
        int id PK
        int component_id FK
        varchar day
        int slot
        varchar room
        varchar instructor
    }

    SCHEDULE_TEMPLATES {
        int id PK
        int term_id FK
        int system_type
        jsonb base_schedules
        varchar preferences_hash
        boolean is_parent
    }
```

Full schema details: [docs/SYSTEM_DOCUMENTATION.md](./docs/SYSTEM_DOCUMENTATION.md#3-database-design--erd)

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js (App Router) | 16 |
| **UI Library** | React | 18 |
| **Styling** | Tailwind CSS + Radix UI | 3.x |
| **Animation** | Framer Motion | 11 |
| **PDF Export** | jsPDF + html2canvas | 2.5 / 1.4 |
| **Backend** | Express | 5.1 |
| **Language** | TypeScript | 5.9 |
| **ORM** | TypeORM | 0.3.27 |
| **Database** | PostgreSQL | 17 |
| **Auth** | JWT + bcrypt | — |
| **Security** | Helmet, CORS, CSRF, rate-limit | — |
| **Containerization** | Docker + Docker Compose | — |
| **Reverse Proxy** | Caddy (auto HTTPS) | — |
| **CI/CD** | GitHub Actions → Docker Hub | — |
| **Runtime** | Node.js | 20 |

---

## Project Structure

```
Potfolio/
├── app/                              # Next.js App Router (28 pages)
│   ├── page.tsx                      # Portfolio home
│   ├── login/                        # Admin login
│   ├── admin/                        # Admin portal (12 pages)
│   ├── student/                      # Student generator (11 pages)
│   ├── timetable/                    # Legacy views
│   └── problem/                      # Problem submission
├── backend/                          # Express API + TypeORM
│   ├── src/
│   │   ├── controllers/              # 12+ request handlers
│   │   ├── entities/                 # 12 database models
│   │   ├── routes/                   # 14 API route modules
│   │   ├── services/                 # Validation, templates
│   │   ├── middleware/               # Auth, CSRF, rate limiting
│   │   └── utils/                    # Cache, termToken, scheduleWorker
│   └── migrations/                   # SQL migration scripts
├── components/                       # React UI components
├── lib/api/                          # Frontend API clients
├── docs/
│   ├── SYSTEM_DOCUMENTATION.md       # Complete technical docs
│   └── screenshots/                  # Live production screenshots (2560×1440 uniform viewport)
├── deploy/vps/                       # VPS config bundle
├── cicd/
│   ├── deployment/                   # VPS deploy scripts
│   ├── linux/                        # Linux build scripts
│   └── windows/                      # Windows build scripts
├── tests/                            # Automated test suite
├── docker-compose.prod.yml           # Production compose (db+backend+frontend)
├── Caddyfile                         # HTTPS reverse proxy
└── .github/workflows/                # CI/CD pipeline
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 17 (local or Docker)
- npm

### Step 1 — Clone the Repository

```bash
git clone https://github.com/MahmoudHaitham/Potfolio.git
cd Potfolio
```

### Step 2 — Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=timetable_admin
DB_PASSWORD=your_password
DB_NAME=timetable_db
DB_SSL=false
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_min_32_chars
TERM_TOKEN_SECRET=your_term_secret_min_32_chars
CLIENT_URL=http://localhost:8000
```

```bash
npm run dev    # http://localhost:5000
```

### Step 3 — Frontend

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

```bash
npm run dev    # http://localhost:8000
```

### Step 4 — Access the Application

| Role | URL | Credentials |
|------|-----|-------------|
| Admin | `/login` | Registration number + password |
| Student | `/student/timetable` | No login required |
| Portfolio | `/` | Public |

---

## Docker & Production Deployment

### Docker Compose Services

| Service | Container | Host Port | Image |
|---------|-----------|-----------|-------|
| Database | `portfolio-db` | internal | `postgres:17` |
| Backend | `portfolio-backend` | 5002 | `mabouellais/timetable-backend:deploy` |
| Frontend | `portfolio-frontend` | 8001 | `mabouellais/timetable-frontend:deploy` |

### VPS Deployment Pipeline

| Step | Script | Purpose |
|------|--------|---------|
| 1 | `cicd/deployment/01-setup-server.sh` | Server setup + firewall |
| 2 | `cicd/deployment/02-install-docker.sh` | Docker installation |
| 3 | `cicd/deployment/05-deploy-app.sh` | Pull images + start containers |
| 4 | `cicd/deployment/06-restore-database.sh` | One-time DB import from `terms.sql` |
| 5 | `cicd/deployment/check-status.sh` | Health check |

```bash
# Every deploy after push to deploy branch
cd /root/portfolio
bash cicd/deployment/05-deploy-app.sh
```

Full guide: [deploy/vps/SERVER_SETUP.md](./deploy/vps/SERVER_SETUP.md)

### CI/CD

GitHub Actions (`.github/workflows/docker-build-push.yml`):
- Trigger: push to `deploy` branch
- Builds and pushes Docker images to Docker Hub
- Optional auto-deploy to VPS when `VPS_DEPLOY_ENABLED=true`

---

## Testing

Automated test suite in `tests/` covering authentication, authorization, API security, CSRF, and performance.

```bash
cd tests
npm install
npm test
```

See [tests/README.md](./tests/README.md) for full test documentation.

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [docs/SYSTEM_DOCUMENTATION.md](./docs/SYSTEM_DOCUMENTATION.md) | Complete technical reference — ERD, sequences, all routes, API |
| [deploy/vps/SERVER_SETUP.md](./deploy/vps/SERVER_SETUP.md) | VPS first-time setup |
| [backend/README.md](./backend/README.md) | Backend quick start |
| [backend/SCHEDULE_CACHING.md](./backend/SCHEDULE_CACHING.md) | Cache architecture |
| [backend/docs/SCHEDULE_TEMPLATES_QUERY_SOURCE.md](./backend/docs/SCHEDULE_TEMPLATES_QUERY_SOURCE.md) | Template query logic |
| [tests/README.md](./tests/README.md) | Automated test suite |

---

## Author & License

**Author:** Mahmoud Haisam Mohammed

- GitHub: [@MahmoudHaitham](https://github.com/MahmoudHaitham)
- Production: [www.mahmoudhaisam.com](https://www.mahmoudhaisam.com)
- Portfolio: [www.mahmoudhaisam.com](https://www.mahmoudhaisam.com)

**License:** MIT

---

University Timetable Management System — Built for academic schedule management at the Arab Academy for Science & Technology
