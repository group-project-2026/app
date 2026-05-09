# Docker Setup Guide

## Project Docker Configuration

This guide walks through the Docker setup for the astronomy catalog backend project.

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  (React, :3000) │
└────────┬────────┘
         │ depends_on
┌────────▼────────┐
│  Backend        │
│  (Django, :8000)│
└────────┬────────┘
         │ depends_on
┌────────▼────────────┐
│  PostgreSQL+PostGIS │
│  (database, :5432)  │
└─────────────────────┘
```

## Files Modified for Docker

### 1. **Dockerfile** (`backend/Dockerfile`)
- Base image: `python:3.12.13-slim-bookworm`
- Installs system dependencies for PostGIS: libgeos, libproj, libgdal
- Uses Poetry for dependency management
- Creates data and staticfiles directories
- Exposes port 8000

### 2. **entrypoint.sh** (`backend/entrypoint.sh`)
- Waits for PostgreSQL to be ready (uses netcat)
- Runs Django migrations
- Enables PostGIS extension
- Loads Fermi-LAT catalog data (first run)
- Starts Django development server

### 3. **docker-compose.yml** (root level)
- **backend** service:
  - Depends on database service
  - Volume mounts for live code reloading
  - Reads environment from `.env` file
  - Port mapping: 8000:8000
  
- **database** service:
  - PostgreSQL 18.1-alpine with PostGIS
  - Health checks with improved readiness probe
  - Volume for data persistence
  - Port mapping: 5432:5432
  
- **frontend** service:
  - React development server
  - Port mapping: 3000:3000

### 4. **pyproject.toml** (Poetry configuration)
Changed from pip requirements to Poetry format:
```toml
[tool.poetry.dependencies]
python = "^3.12"
django = "^6.0.3"
djangorestframework = "^3.14.0"
psycopg2-binary = "^2.9.11"
numpy = "^2.4.4"
astropy = "^7.2.0"
requests = "^2.31.0"
gunicorn = "^21.2.0"
```

### 5. **settings.py** (Django configuration)
- Changed DATABASES engine to `django.contrib.gis.db.backends.postgis`
- Added STATIC_ROOT configuration
- Added django.contrib.gis to INSTALLED_APPS
- Configured REST_FRAMEWORK with pagination and filters

## Quick Start

### Prerequisites
```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version
```

### Build and Run
```bash
# From project root
docker-compose up --build

# First run will:
# 1. Build the backend image
# 2. Start PostgreSQL
# 3. Wait for PostgreSQL to be ready
# 4. Run migrations
# 5. Enable PostGIS
# 6. Load Fermi-LAT catalog (downloads ~50MB FITS file)
# 7. Start the backend server
```

### Subsequent Runs
```bash
# Just start without rebuilding
docker-compose up

# Or in detached mode
docker-compose up -d

# View logs
docker-compose logs backend    # Backend logs
docker-compose logs database   # Database logs
docker-compose logs frontend   # Frontend logs

# View all logs
docker-compose logs -f
```

## Accessing the Application

After startup completes, access:
- **API**: http://localhost:8000/api/
- **Admin**: http://localhost:8000/admin/
- **Frontend**: http://localhost:3000 (when ready)

## Environment Variables

Required in `.env` (in project root):
```env
POSTGRES_DB=fermi
POSTGRES_USER=fermi
POSTGRES_PASSWORD=fermi
POSTGRES_HOST=database
POSTGRES_PORT=5432
```

These are automatically used by docker-compose for both PostgreSQL and Django.

## Common Docker Commands

```bash
# Stop containers
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove all data (CAUTION!)
docker-compose down -v

# Rebuild image
docker-compose build --no-cache

# Run one-off command in backend
docker-compose exec backend python manage.py shell

# View resource usage
docker stats

# Connect to PostgreSQL
docker-compose exec database psql -U fermi -d fermi
```

## Troubleshooting

### PostgreSQL health check fails
```bash
# Check PostgreSQL logs
docker-compose logs database

# Check if port 5432 is already in use
lsof -i :5432
```

### Backend won't start
```bash
# Check backend logs
docker-compose logs backend

# Manually run migrations
docker-compose exec backend python manage.py migrate

# Restart backend service
docker-compose restart backend
```

### PostGIS extension not available
```bash
# Connect to database and verify
docker-compose exec database psql -U fermi -d fermi -c "SELECT PostGIS_Version();"
```

### No data loaded
```bash
# Manually load Fermi catalog
docker-compose exec backend python manage.py ingest_catalogs --catalogs FERMI

# View ingestion progress
docker-compose logs -f backend
```

### Port already in use
- Backend (8000): Edit docker-compose.yml, change `8000:8000` to `8001:8000`
- Database (5432): Change `5432:5432` to `5433:5432`
- Frontend (3000): Change `3000:3000` to `3001:3000`

## Performance Notes

1. **First run takes longer** - Downloads and processes Fermi-LAT catalog (~5-10 minutes)
2. **Volume mounts** - Live code reloading enabled, restart backend for Django changes
3. **Database persistence** - Data persists in `postgres-data` volume
4. **Static files** - Collected during build, reachable at `/static/`

## Development Workflow

### Making code changes
```bash
# Edit files locally (live reload for Python)
# Django should restart automatically
# Check backend logs
docker-compose logs -f backend
```

### Running management commands
```bash
# Inside container
docker-compose exec backend python manage.py <command>

# Examples
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py ingest_catalogs --catalogs LHAASO
```

### Viewing database
```bash
# Connect with psql
docker-compose exec database psql -U fermi -d fermi

# View tables
\dt

# Query sources
SELECT unified_name, primary_catalog FROM sources_source LIMIT 10;

# Exit
\q
```

## Production Deployment Notes

For production, consider:

1. **Remove volume mount** for backend code (security)
2. **Use gunicorn** instead of development server
3. **Configure nginx** reverse proxy
4. **Set DEBUG = False** in settings
5. **Use strong SECRET_KEY**
6. **Configure ALLOWED_HOSTS**
7. **Use persistent storage** for data/
8. **Set up monitoring** (logs, metrics)
9. **Configure backups** for database volume

## Files Overview

| File | Purpose | Last Updated |
|------|---------|---|
| `Dockerfile` | Container image definition | ✓ Updated |
| `entrypoint.sh` | Startup script | ✓ Updated |
| `docker-compose.yml` | Service orchestration | ✓ Updated |
| `pyproject.toml` | Python dependencies | ✓ Updated |
| `app/settings.py` | Django config | ✓ Updated |
| `.env` | Environment variables | ✓ In place |
| `.dockerignore` | Build excludes | ✓ Created |

## Summary of Changes

✅ Dockerfile: Added PostGIS libraries, Poetry support, static files setup  
✅ entrypoint.sh: Added health checks, PostGIS setup, catalog loading  
✅ docker-compose.yml: Fixed PostgreSQL health check  
✅ pyproject.toml: Proper Poetry format with all dependencies  
✅ settings.py: PostGIS database backend, STATIC_ROOT, REST_FRAMEWORK config  
✅ .dockerignore: Optimized build context  

All files are now configured for a complete Docker build and run!
