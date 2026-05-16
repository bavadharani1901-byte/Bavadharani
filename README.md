# WAVE

WAVE is an AI-assisted water pollution monitoring platform for river and urban waterway response teams. It combines citizen photo reports, satellite anomaly detection, and OpenStreetMap source attribution into an explainable zone-level risk score for NGOs, government inspectors, and the public.

The project is built as a hackathon-ready MVP: the web app runs in Next.js, the dashboard uses cached local demo data, and Python pipelines can refresh the AI/satellite/OSM evidence streams when credentials and dependencies are available.

## What WAVE does

- Monitors waterway zones with a 0-100 pollution risk score.
- Lets citizens submit water pollution reports and earn points.
- Uses Photo AI to assess whether a submitted image shows water, trash, turbidity, poor quality, or needs review.
- Uses Sentinel-2 / Google Earth Engine data to detect turbidity anomalies against historical baselines.
- Uses OpenStreetMap / Overpass data to identify likely nearby pollution sources such as industrial, wastewater, landfill, drainage, agricultural, or domestic features.
- Gives dashboard users a breakdown of why a zone is low, medium, high, or critical risk.

## Core user surfaces

- Landing page: `/`
- Citizen app: `/citizen`
- Citizen report flow: `/citizen/report`
- Citizen rewards: `/citizen/rewards`
- Citizen leaderboard: `/citizen/leaderboard`
- Monitoring dashboard: `/dashboard`
- NGO dashboard: `/dashboard/ngo`
- Login: `/auth/login`
- Register: `/auth/register`

## Architecture

```text
Citizen / NGO / Government UI
        |
        v
Next.js App Router + API routes
        |
        +--> File-based MVP data store: data/db.json
        |       - zones
        |       - citizen reports
        |       - citizens and points
        |       - satellite observations/anomalies
        |       - OSM source attribution
        |       - inspector actions
        |
        +--> PostgreSQL via Drizzle
        |       - users and authentication
        |
        +--> Photo AI service, FastAPI on port 8000
        |       - image quality checks
        |       - water/trash/turbidity model inference
        |       - deterministic mock fallback from Next.js if unavailable
        |
        +--> Offline/precompute pipelines
                - Sentinel-2 / Google Earth Engine satellite readings
                - OpenStreetMap / Overpass source attribution
```

## Tech stack

Frontend and app:
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Leaflet
- Recharts
- NextAuth v5 beta
- Drizzle ORM
- PostgreSQL
- Bun

AI and data pipelines:
- Python 3
- FastAPI + Uvicorn
- Pillow, NumPy, Requests, Pydantic
- Google Earth Engine API
- Optional PyTorch / TorchVision for local Photo AI inference

## Project structure

```text
app/                         Next.js pages and API routes
components/                  React UI components
  citizen/                   Citizen mobile-style flows
  dashboard/                 Monitoring dashboard components
  landing/                   Landing page sections
  ui/                        Shared UI primitives
hooks/                       Client-side data hooks
lib/                         Shared app services and MVP JSON database
  db.ts                      File-based JSON data access layer
  services/photo-ai.ts       Next.js Photo AI client + mock fallback
  services/risk-scoring.ts   Zone risk score engine
  services/satellite.ts      Satellite evidence adapter
  services/osm.ts            OSM attribution adapter
db/                          Drizzle schema, migrations, and seed script
data/                        Demo and cached MVP data
ai/photo_ai/                 FastAPI Photo AI service and scoring helpers
ai/satellite/                Sentinel-2 / GEE anomaly pipeline
ai/osm/                      OSM / Overpass source attribution pipeline
ai/water-cv/                 Photo AI model artifacts and CV notes
scripts/dev-with-ai.mjs      Starts web + Photo AI, refreshes missing caches
```

## Prerequisites

Install these before running the full project:

- Bun
- Node.js compatible with Next.js 16
- Python 3.11+ recommended
- PostgreSQL
- Optional: Google Earth Engine account/project for live satellite precompute
- Optional: PyTorch + TorchVision for real Photo AI inference

## Environment variables

Create `.env.local` in the repository root.

```bash
# Required for auth
AUTH_SECRET="replace-with-a-random-secret"

# Required for Drizzle/NextAuth users table
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wave"

# Optional. If omitted, Next.js falls back to deterministic mock Photo AI results.
PHOTO_AI_API_URL="http://localhost:8000"

# Optional. Used to resolve relative image URLs before sending them to Photo AI.
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional. Enables Photo AI debug payloads from the Next.js service wrapper.
PHOTO_AI_DEBUG="false"

# Optional. Skip slow precompute checks in bun run dev.
SKIP_SATELLITE_PRECOMPUTE="true"
SKIP_OSM_PRECOMPUTE="true"
```

Generate a local auth secret with:

```bash
openssl rand -base64 32
```

## Installation

Install JavaScript dependencies:

```bash
bun install
```

Create and activate a Python virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If you want real local Photo AI model inference instead of mock/fallback behavior, install PyTorch and TorchVision separately for your platform. For CPU-only Linux, one common option is:

```bash
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

## Database setup

WAVE currently uses PostgreSQL for authentication users and `data/db.json` for MVP demo domain data.

1. Create a PostgreSQL database named `wave` or update `DATABASE_URL` to match your database.

2. Run Drizzle migrations:

```bash
bun run db:migrate
```

If you are iterating locally and want to push schema directly:

```bash
bun run db:push
```

3. Seed demo users:

```bash
bun run db:seed
```

Demo accounts created by the seed script:

| Role | Email | Password |
| --- | --- | --- |
| NGO | `ngo@wave.local` | `ngo` |
| Government | `gov@wave.local` | `gov` |
| Public X | `userx@wave.local` | `userX` |
| Public Y | `usery@wave.local` | `userY` |

## Running locally

Start the full local MVP:

```bash
bun run dev
```

This runs:
- Next.js at `http://localhost:3000`
- Photo AI FastAPI at `http://localhost:8000`
- satellite precompute only if cached satellite data is missing
- OSM precompute only if cached OSM data is missing

For frontend-only development:

```bash
bun run dev:web
```

For Photo AI only:

```bash
bun run ai:photo
```

Health check:

```bash
curl http://localhost:8000/health
```

## AI and data pipelines

### Photo AI

Start the FastAPI service:

```bash
bun run ai:photo
```

Analyze an image URL:

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_url":"https://example.com/water.jpg","include_debug":false}'
```

If `PHOTO_AI_API_URL` is not configured or the service is unavailable, the Next.js app uses deterministic mock results so demos still work.

### Satellite anomaly precompute

The satellite pipeline reads zones from `data/seed_zones.json`, queries Sentinel-2 through Google Earth Engine, computes water/turbidity indices, writes `data/seed_satellite_readings.json`, and syncs `data/db.json` when present.

Authenticate Earth Engine first if you want live data:

```bash
earthengine authenticate
```

Then run:

```bash
bun run ai:satellite
```

### OSM source attribution precompute

The OSM pipeline reads zones from `data/seed_zones.json`, queries Overpass, classifies nearby pollution source candidates, writes `data/seed_osm_sources.json`, and syncs `data/db.json` when present.

```bash
bun run ai:osm
```

## Risk scoring model

`lib/services/risk-scoring.ts` computes an explainable risk score from four evidence streams:

| Signal | Weight |
| --- | ---: |
| Satellite anomaly, confidence weighted | 30% |
| OSM source attribution | 20% |
| Photo AI score | 25% |
| Verified citizen reports | 15% |
| Recent inspector resolution | -10% adjustment |

Risk levels:

| Score | Level |
| ---: | --- |
| 0-30 | Low |
| 31-60 | Medium |
| 61-85 | High |
| 86-100 | Critical |

Each zone detail API response includes the score, level, breakdown, and human-readable explanation.

## API overview

Important API routes:

```text
GET  /api/v1/zones
GET  /api/v1/zones/:zone_id
POST /api/v1/zones/:zone_id/recompute
GET  /api/v1/reports
POST /api/v1/reports
GET  /api/v1/citizens/me
GET  /api/v1/leaderboard
POST /api/v1/inspector/:zone_id/resolve
POST /api/auth/register
GET/POST /api/auth/*
```

## Testing and checks

Run TypeScript checks:

```bash
bunx tsc --noEmit
```

Run ESLint:

```bash
bun run lint
```

Run Python tests:

```bash
python ai/photo_ai/test_model_runner.py
python ai/satellite/test_anomaly.py
python ai/osm/test_attribution.py
```

Current known status:
- `bunx tsc --noEmit` passes.
- Python helper tests pass.
- `bun run lint` may fail until ESLint ignores local Python virtual environments such as `.venv/` and remaining strict lint findings are fixed.

## Demo workflow

1. Start PostgreSQL and set `DATABASE_URL`.
2. Run migrations and seed users.
3. Start the app with `bun run dev`.
4. Open `http://localhost:3000`.
5. Log in with `ngo@wave.local / ngo` for dashboard usage or `userx@wave.local / userX` for citizen usage.
6. Visit `/dashboard` to inspect zone risks.
7. Visit `/citizen/report` to submit a report with an image URL.
8. Watch the zone risk score and citizen points update.

## MVP limitations

This repository is intentionally optimized for demo speed. Before production, address these items:

- Move domain data from `data/db.json` into PostgreSQL/Drizzle.
- Prevent public registration from accepting privileged roles from request bodies.
- Add authorization checks for NGO/government/inspector-only API actions.
- Replace URL-only photo submission with a real upload flow and storage backend.
- Harden Photo AI image fetching against SSRF, private network access, redirects, and oversized downloads.
- Add date windows or decay to citizen report scoring.
- Add stronger Sentinel-2 cloud/shadow/water masking for production satellite analytics.
- Add API route tests and TypeScript tests for risk scoring.
- Update ESLint ignores to exclude generated/dependency folders.

## Useful scripts

```bash
bun run dev           # Next.js + Photo AI + cached/precompute checks
bun run dev:web       # Next.js only
bun run build         # Production build
bun run start         # Start production Next.js server
bun run lint          # ESLint
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Run Drizzle migrations
bun run db:push       # Push schema directly
bun run db:studio     # Open Drizzle Studio
bun run db:seed       # Seed demo auth users
bun run ai:photo      # Start Photo AI FastAPI service
bun run ai:satellite  # Refresh satellite readings from GEE
bun run ai:osm        # Refresh OSM source attribution from Overpass
```

## License

No license file is currently included. Add a license before publishing or accepting external contributions.
