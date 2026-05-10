# Infrastructure

Docker-based local development stack defined in `docker-compose.yml` at the repository root.

---

## Docker Compose Services

| Service | Build / Image | Exposed Ports | Purpose |
|---------|--------------|---------------|---------|
| `backend` | Build: `backend/Dockerfile` | `8000:8000` | Django REST API |
| `frontend` | Build: `frontend/Dockerfile` | `3000:3000` | Vite dev server (React SPA) |
| `database` | Image: `postgis/postgis:16-3.4-alpine` | `5432:5432` | PostgreSQL 16 with PostGIS 3.4 |

### Service Dependencies

```
database ──(healthy)──▶ backend ──(healthy)──▶ frontend
```

- `backend` waits for `database` health-check to pass before starting.
- `frontend` waits for `backend` health-check to pass before starting.

### Health Checks

**`database`**
```yaml
test: pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}
interval: 10s  timeout: 5s  retries: 5  start_period: 10s
```

**`backend`**
```yaml
test: curl -fsS http://localhost:8000/api/sources/?page=1&page_size=1 || exit 1
interval: 5s  timeout: 5s  retries: 5  start_period: 180s
```

The 180-second `start_period` accounts for the time needed to download and ingest catalog data on first run.

---

## Volumes

| Volume | Mounted In | Purpose |
|--------|-----------|---------|
| `postgres-data` (named) | `database:/var/lib/postgresql/data` | Persists PostgreSQL data files across container restarts |
| `./backend` (bind mount) | `backend:/app` | Live-reloads backend source code |
| `./frontend` (bind mount) | `frontend:/app` | Live-reloads frontend source code |
| `/app/node_modules` (anonymous) | `frontend:/app/node_modules` | Prevents the host bind mount from overwriting the container-built `node_modules` |

---

## Networks

Docker Compose creates a single default network for this project. All three services (`backend`, `frontend`, `database`) are attached to it automatically. No custom network names are defined in `docker-compose.yml`.

---

## Dockerfiles

### `backend/Dockerfile`

**Base image:** `python:3.12.13-slim-bookworm`

**Stages:** Single stage (no multi-stage build).

**What gets installed:**

1. System packages via `apt-get`:
   - PostGIS / GIS libraries: `libpq-dev`, `libgeos-dev`, `libproj-dev`, `libgdal-dev`, `gdal-bin`
   - Build tools: `gcc`, `g++`, `gfortran`, `build-essential`
   - Utilities: `postgresql-client`, `netcat-openbsd`, `ca-certificates`, `curl`, `git`

2. Python packages via Poetry (`pyproject.toml` + `poetry.lock`):
   - Installs with `POETRY_VIRTUALENVS_CREATE=false` (system-wide, no venv)
   - Runs `poetry install --no-root --no-dev`

3. Django static files collected with `manage.py collectstatic`.

**`WORKDIR`:** `/app`

**Entrypoint:** `/app/entrypoint.sh`

**Exposed port:** `8000`

---

### `frontend/Dockerfile`

**Base image:** `node:22.22.2-bookworm-slim`

**Stages:** Single stage.

**What gets installed:**

1. `npm ci` — installs exact dependencies from `package-lock.json`.
2. Copies all frontend source files.

**`WORKDIR`:** `/app`

**`ENV NODE_ENV`:** `development`

**Entrypoint:** `./entrypoint.sh` → `npm run dev -- --host --port 3000`

**Exposed port:** `3000`

---

## Environment Variables / Secrets

All environment variables are provided via a single `.env` file at the repository root. Both `backend` and `frontend` services reference it with `env_file: - .env`.

`.env.example` (checked in) shows the required variables:

```env
POSTGRES_DB=fermi
POSTGRES_USER=fermi
POSTGRES_PASSWORD=fermi
POSTGRES_HOST=database
POSTGRES_PORT=5432
```

| Variable | Used By | Purpose |
|----------|---------|---------|
| `POSTGRES_DB` | `backend`, `database` | Database name |
| `POSTGRES_USER` | `backend`, `database` | Database username |
| `POSTGRES_PASSWORD` | `backend`, `database` | Database password |
| `POSTGRES_HOST` | `backend` | Database hostname (`database` = service name) |
| `POSTGRES_PORT` | `backend`, `database` | Database port |
| `VITE_API_BASE_URL` | `frontend` | API base URL (default `/api`) |
| `VITE_PROXY_TARGET` | `frontend` | Dev proxy target for `/api` (default `http://backend:8000`) |

The last two Vite variables are not present in `.env.example` but are consumed by the frontend if supplied.

---

## Docker Compose Override Files

No `docker-compose.override.yml` or environment-specific override files are present in the repository.

---

## Running the Full Stack

```bash
# Build images and start all services detached
docker compose up -d --build

# Or using the Makefile shortcut
make
```

**Readiness order:**

1. `database` starts → passes `pg_isready` health-check.
2. `backend` starts → runs migrations, ingests catalogs, passes `curl` health-check (up to ~3 minutes on first run).
3. `frontend` starts → Vite dev server becomes available.

**Verify everything is healthy:**

```bash
docker compose ps
# All three services should show status "healthy" or "running"
```

---

## Common Operations

### Rebuild a single service

```bash
docker compose up -d --build backend
```

### View logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f backend
```

### Run a one-off Django management command inside the container

```bash
docker exec -it backend python manage.py <command>

# Examples
docker exec -it backend python manage.py createsuperuser
docker exec -it backend python manage.py migrate
docker exec -it backend python manage.py ingest_catalogs --catalogs FERMI
```

### Open a Django shell

```bash
docker exec -it backend python manage.py shell
```

### Open a database shell

```bash
docker exec -it database psql -U fermi -d fermi
```

### Reset volumes (destroy all data and start fresh)

```bash
docker compose down -v
docker compose up -d --build
```

> **Warning:** `docker compose down -v` permanently deletes the `postgres-data` named volume and all stored catalog data.
