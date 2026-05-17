# Backend

Django REST API for the astronomy catalog aggregation system.

---

## Tech Stack

| Component | Version / Value |
|-----------|----------------|
| Python | 3.12 |
| Django | ^6.0.3 |
| Django REST Framework | ^3.14.0 |
| Database driver | psycopg2-binary ^2.9.11 (PostGIS / PostgreSQL 16) |
| GeoDjango | django.contrib.gis (built-in) |
| Astronomy libs | astropy ^7.2.0, astroquery ^0.4.7, gammapy ^1.0, numpy ^2.4.4 |
| HTTP server | gunicorn ^21.2.0 |
| Dependency manager | Poetry |

Dev dependencies: pytest ^9.0.2, pytest-django ^4.7.0, black ^24.1.0, flake8 ^7.0.0.

---

## Project Layout

```
backend/
├── app/            # Django project configuration (settings, urls, wsgi, asgi)
├── sources/        # Core models: Source and CatalogEntry
├── catalogs/       # Catalog ingestion framework (loaders, cross-matching, management commands)
├── api/            # DRF serializers, views, router, pagination
├── fermi/          # Fermi-LAT–specific legacy models (FermiSource, SedPoint)
├── data/           # Downloaded catalog FITS/YAML files (git-ignored)
├── staticfiles/    # Collected static files (generated at build time)
├── tests/          # Project-level tests
├── manage.py
├── pyproject.toml
├── Dockerfile
└── entrypoint.sh
```

### Django Apps

| App | Responsibility |
|-----|---------------|
| `sources` | Defines the two core models (`Source`, `CatalogEntry`) shared across all catalogs |
| `catalogs` | Pluggable loader architecture for each catalog; `CrossMatchService`; `ingest_catalogs` management command |
| `api` | All REST API ViewSets, serializers, URL router, and pagination class |
| `fermi` | Legacy Fermi-LAT–specific models (`FermiSource`, `SedPoint`) loaded from the 4FGL FITS file |

---
ć
## Configuration

Settings file: `backend/app/settings.py`

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `POSTGRES_ENGINE` | `django.contrib.gis.db.backends.postgis` | Django database backend |
| `POSTGRES_DB` | `fermi` | Database name |
| `POSTGRES_USER` | `fermi` | Database user |
| `POSTGRES_PASSWORD` | `fermi` | Database password |
| `POSTGRES_HOST` | `database` | Database host (service name in Docker Compose) |
| `POSTGRES_PORT` | `5432` | Database port |

All variables are read at runtime with `os.getenv()`. They are passed in via `.env` when running under Docker Compose.

### Notable Settings

- `DEBUG = True` — development mode only; not suitable for production.
- `ALLOWED_HOSTS = ["*"]` — allows all hosts.
- `SECRET_KEY` — a static insecure development key; must be rotated before any public deployment.
- `FILES_DIR = BASE_DIR / "data"` — local directory where downloaded catalog files are cached.
- REST Framework default page size: **50**, max page size: **1000**.
- All API endpoints are publicly accessible (`AllowAny` permission class).
- `TIME_ZONE = "UTC"`, `USE_TZ = True`.

---

## Data Model Overview

### `sources` app

**`Source`** — a unified astronomical object aggregated across catalogs.

| Field | Type | Notes |
|-------|------|-------|
| `id` | BigAutoField | PK |
| `unified_name` | CharField | Unique; indexed |
| `ra` | FloatField | Right Ascension J2000 [degrees, 0–360] |
| `dec` | FloatField | Declination J2000 [degrees, −90–+90] |
| `position` | PointField (SRID 4326) | Auto-generated from `ra`/`dec` on save; GIST index |
| `discovery_date` | DateTimeField | Nullable |
| `primary_catalog` | CharField | Choices: `FERMI`, `LHAASO`, `HAWC`, `TEVCAT`, `NED` |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

Composite indexes: `(ra, dec)`, `(primary_catalog)`.

**`CatalogEntry`** — catalog-specific record linked to a `Source`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | BigAutoField | PK |
| `source` | ForeignKey(Source) | CASCADE delete |
| `catalog_name` | CharField | `FERMI`, `LHAASO`, `HAWC`, `TEVCAT`, `NED`; indexed |
| `original_name` | CharField | Name as it appears in the source catalog |
| `metadata` | JSONField | Catalog-specific payload (flux, spectrum, classification, etc.) |
| `discovery_method` | CharField | Detection method, e.g. `"gamma-ray"` |
| `confidence` | FloatField | Cross-match confidence 0.0–1.0; default 1.0 |
| `last_verified` | DateTimeField | Auto |

Unique constraint: `(catalog_name, original_name)`. One `Source` → many `CatalogEntry` records.

### `fermi` app (legacy)

**`FermiSource`** — Fermi-LAT 4FGL entry loaded directly from the FITS file.

Key fields: `source_name`, `source_class`, `associated_name`, `ra`, `dec`, `glon`, `glat`, position uncertainty (semi-major/minor/angle), `flux1000`, `significance`, `ts`, spectral type and index, `redshift`, `variability_index`, `is_variable`, `data_release`.

**`SedPoint`** — spectral energy distribution point for a `FermiSource`.

Key fields: `source` (FK), `band` (0–6, covering 50 MeV to 100+ GeV), `e_min`, `e_max`, `e_center`, `flux`, `err_lo`, `err_hi`, `is_upper_limit`. Unique on `(source, band)`.

---

## API Overview

Base path: `/api/`
Router: DRF `DefaultRouter`

### Sources (`/api/sources/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sources/` | Paginated source list. Query params: `search`, `ordering`, `catalog`, `page`, `page_size`. |
| GET | `/api/sources/{id}/` | Source detail with nested catalog entries. |
| GET | `/api/sources/region/` | Spatial cone search. Params: `ra`, `dec`, `radius` (degrees, default 0.5). |
| GET | `/api/sources/filter/` | Advanced filtering. Params: `catalog`, `search`, `source_class`, `ra_min/max`, `dec_min/max`, `confidence_min/max`, `significance_min/max`, `flux_min/max`, `min_catalog_count`. |
| GET | `/api/sources/analytics/` | Analytics dashboard data: catalog comparison, detection trends, significance histogram. Params: `catalog`, `search`. |
| GET | `/api/sources/analytics_map/` | Map-ready paginated points with spatial/temporal bounding. Params: `catalog`, `search`, `ra_min/max`, `dec_min/max`, `significance_min/max`, `flux_min/max`, `discovery_date_start/end`, `ra`, `dec`, `radius`. |
| GET | `/api/sources/{id}/catalog_entries/` | All catalog entries for a source. |
| GET | `/api/sources/{id}/magic_simulation/` | On-demand MAGIC telescope simulation for a source. Returns pre-calculated results if live spectrum data is unavailable. Returns HTTP 400 if neither live nor pre-calculated data is available. |

#### MAGIC Simulation Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `zenith_angle` | string | `low` / `mid` / `high` | — | Zenith angle band |
| `observation_time_hours` | float | 0.1–10 000 | 20 | Observation time in hours |
| `psf_deg` | float | 0–1 | 0.1 | Point spread function radius (degrees) |
| `extension_deg` | float | 0–1 | 0 | Source extension (degrees) |
| `offset_deg` | float | 0.01–1 | 1 | Camera offset (degrees) |
| `num_off_regions` | int | 1–7 | 3 | Number of off regions |
| `min_events` | int | 1–1 000 | 10 | Minimum event count threshold |
| `min_sbr` | float | 0–1 | 0.05 | Minimum signal-to-background ratio |

The response includes simulation results augmented with the source metadata and its matching catalog entry. During catalog ingestion, MAGIC simulation results are pre-calculated for each source with complete spectral data and stored in the catalog entry metadata (`magic_significance`, `magic_detectable`, `magic_calculated_at`, `magic_params_hash`); sources with incomplete spectra are silently skipped.

Search fields: `unified_name`, `catalog_entries__original_name`.
Ordering fields: `unified_name`, `created_at`, `primary_catalog`.

### Catalog Entries (`/api/catalog-entries/`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/catalog-entries/` | Paginated list. Search: `original_name`, `source__unified_name`. Filter: `catalog_name`, `source`. |
| GET | `/api/catalog-entries/{id}/` | Entry detail. |

---

## Celery

No Celery is configured in this project. All operations (including catalog ingestion) are synchronous.

---

## Running Locally (Outside Docker)

```bash
cd backend

# Install dependencies
pip install poetry
poetry install

# Set required environment variables
export POSTGRES_DB=fermi
export POSTGRES_USER=fermi
export POSTGRES_PASSWORD=fermi
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432

# Apply migrations (requires a running PostGIS-enabled PostgreSQL instance)
python manage.py migrate

# Ingest catalogs (optional, downloads FITS/YAML files from the internet)
python manage.py ingest_catalogs --catalogs FERMI LHAASO HAWC TEVCAT

# Start development server
python manage.py runserver
```

The server will be available at <http://localhost:8000>.

---

## Running Tests

```bash
cd backend
pytest
```

pytest configuration is in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "app.settings"
python_files = "tests.py test_*.py *_tests.py"
```

Tests live in `backend/tests/`.

---

## Common Management Commands

| Command | Purpose |
|---------|---------|
| `python manage.py migrate` | Apply database migrations |
| `python manage.py createsuperuser` | Create a Django admin user |
| `python manage.py collectstatic --noinput` | Collect static files to `staticfiles/` |
| `python manage.py ingest_catalogs --catalogs FERMI LHAASO HAWC TEVCAT` | Download and ingest all catalogs |
| `python manage.py ingest_catalogs --clear --catalogs FERMI` | Clear existing data and re-ingest a single catalog |
| `python manage.py ingest_catalogs --match-radius 0.2` | Ingest with a custom cross-match radius (degrees) |

### Catalog Ingestion Details

The `ingest_catalogs` command uses a pluggable `LoaderFactory` to download catalog files (FITS, YAML) into `backend/data/` and then cross-matches each source against existing `Source` records using PostGIS spatial queries (default radius 0.1°). It prints created/matched counts per catalog.

Supported catalogs:

| Catalog | Format | Source |
|---------|--------|--------|
| `FERMI` | FITS (4FGL) | NASA Fermi-LAT 10-year catalog |
| `LHAASO` | FITS | gammapy-data GitHub mirror |
| `HAWC` | YAML | HAWC Observatory 3HWC |
| `TEVCAT` | TAP query | HEASARC `tevcat` table via astroquery |
| `NED` | — | Not yet implemented |
