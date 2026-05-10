# Fermi — Astronomy Catalog Aggregation System

A web application that unifies multiple high-energy gamma-ray astronomical catalogs (Fermi-LAT, LHAASO, HAWC, TeVCat) into a single spatially-indexed database with a REST API and interactive 3D visualization frontend.

---

## Monorepo Layout

| Folder | Purpose |
|--------|---------|
| `backend/` | Django REST API, PostGIS database models, catalog ingestion pipeline |
| `frontend/` | React + Vite SPA — data tables, analytics dashboard, 3D celestial sphere |
| `docs/` | Project documentation (this folder) |
| `.env` / `.env.example` | Root-level environment variables shared by all services via Docker Compose |
| `docker-compose.yml` | Orchestrates `backend`, `frontend`, and `database` services |
| `Makefile` | Convenience target: `make` → `docker compose up -d --build` |

---

## Documentation

- [Backend](backend.md) — Django apps, models, API endpoints, configuration
- [Frontend](frontend.md) — React structure, routing, state, API client
- [Infrastructure](infrastructure.md) — Docker Compose services, Dockerfiles, volumes

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd app

# 2. Create the environment file
cp .env.example .env
# Edit .env if you need to change database credentials (defaults work out of the box)

# 3. Build and start the full stack
make
# or, without make:
docker compose up -d --build
```

On first boot the backend container will:
1. Wait for PostgreSQL to be ready.
2. Enable the PostGIS extension.
3. Run Django migrations.
4. Download and ingest catalog data from FERMI, LHAASO, HAWC, and TeVCat (this can take a few minutes).
5. Start the Django development server.

The frontend container starts only after the backend health-check passes.

| Service | URL |
|---------|-----|
| Frontend (React SPA) | <http://localhost:3000> |
| Backend (Django API) | <http://localhost:8000/api/> |
| Django Admin | <http://localhost:8000/admin/> |

To create a Django superuser for the admin panel:

```bash
docker exec -it backend python manage.py createsuperuser
```
