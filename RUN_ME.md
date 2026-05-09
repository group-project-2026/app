# 🚀 READY TO RUN!

## Quick Start (Recommended)

```bash
# Navigate to project root
cd /home/bartosz/Projects/group-project-2026/app

# Start everything with Docker
docker-compose up --build
```

That's it! The system will:
1. Build the Docker images
2. Start PostgreSQL with PostGIS
3. Run migrations
4. Load the Fermi-LAT catalog
5. Start the backend server

## Access Points

Once startup completes (5-10 minutes on first run):

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | http://localhost:8000/api/ | REST API endpoints |
| Django Admin | http://localhost:8000/admin/ | Data management |
| Frontend | http://localhost:3000 | React application |

## What Was Fixed

### ✅ Docker Configuration
- **Dockerfile** - Complete rebuild with PostGIS support
- **entrypoint.sh** - Proper startup sequence with health checks
- **docker-compose.yml** - Fixed PostgreSQL health check

### ✅ Python Dependencies
- **pyproject.toml** - Converted to proper Poetry format
- All dependencies properly specified for Django 6.0.3 + PostGIS

### ✅ Django Configuration
- **settings.py** - Updated for PostGIS, DRF, and all new apps
- **urls.py** - Added API routing
- All 3 new apps registered (sources, catalogs, api)

### ✅ Project Structure
- Created 3 modular Django apps
- Implemented models, serializers, viewsets
- Built ingestion framework with cross-matching
- Created management commands
- Added comprehensive documentation

## First Run Notes

The **first startup will take longer** (5-10 minutes) because:
1. Docker builds the image (~2 min)
2. Python packages are installed (~3 min)
3. Fermi-LAT FITS catalog is downloaded and processed (~5 min)

Subsequent runs start in seconds.

## View Progress

```bash
# In another terminal, watch the logs
docker-compose logs -f backend
```

## Common Tasks

```bash
# Stop everything
docker-compose down

# Stop and preserve data
docker-compose stop

# Remove everything (CAUTION - will delete database!)
docker-compose down -v

# Run management commands
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py ingest_catalogs --catalogs FERMI

# View database
docker-compose exec database psql -U fermi -d fermi

# Restart just backend
docker-compose restart backend
```

## Accessing the API

### List all sources
```bash
curl http://localhost:8000/api/sources/
```

### Spatial search (within 0.5 degrees)
```bash
curl "http://localhost:8000/api/sources/region/?ra=123.45&dec=-45.67&radius=0.5"
```

### Search by name
```bash
curl "http://localhost:8000/api/sources/filter/?search=3C279"
```

### Filter by catalog
```bash
curl "http://localhost:8000/api/sources/filter/?catalog=FERMI"
```

## Documentation Files

- **QUICKSTART.md** - API usage and examples
- **DOCKER_SETUP.md** - Detailed Docker configuration
- **backend/README.md** - Backend-specific documentation
- **COMPLETION_CHECKLIST.md** - What was done and verification steps

## Environment Variables

All configured in `.env`:
```
POSTGRES_DB=fermi
POSTGRES_USER=fermi
POSTGRES_PASSWORD=fermi
POSTGRES_HOST=database
POSTGRES_PORT=5432
```

These are automatically picked up by Docker.

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend

# Check if ports are available
lsof -i :8000
lsof -i :5432
lsof -i :3000
```

### Database connection issues
```bash
# Test database connectivity
docker-compose exec backend python manage.py migrate

# Check PostGIS
docker-compose exec database psql -U fermi -d fermi -c "SELECT PostGIS_Version();"
```

### No data loaded
```bash
# Manually load Fermi catalog
docker-compose exec backend python manage.py ingest_catalogs --catalogs FERMI
```

## Production Notes

For production deployment, update:
- `settings.py`: Set `DEBUG = False`
- Set a strong `SECRET_KEY`
- Configure `ALLOWED_HOSTS`
- Use `gunicorn` instead of development server
- Set up reverse proxy (nginx)
- Enable HTTPS/TLS
- Configure backups

## Summary

Everything is ready! The Docker setup is complete with:
- ✅ PostgreSQL + PostGIS for spatial queries
- ✅ Django REST Framework with pagination
- ✅ Automated catalog ingestion
- ✅ Complete API with spatial search
- ✅ Django admin interface
- ✅ Proper dependency management with Poetry

**Run `docker-compose up --build` and the system will handle the rest!**
