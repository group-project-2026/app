# Backend - Astronomy Catalog System

Scalable Django REST API for aggregating multi-catalog astronomical sources with PostGIS spatial queries.

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- `.env` file configured (see `.env.example`)

### Run the application

```bash
# From the project root directory
docker-compose up --build

# The backend will be available at http://localhost:8000
# API endpoints at http://localhost:8000/api/
# Admin at http://localhost:8000/admin/
```

The startup sequence:
1. PostgreSQL container starts with PostGIS extension
2. Backend waits for PostgreSQL to be ready
3. Migrations are applied
4. PostGIS extension is enabled
5. Fermi-LAT catalog is loaded (first run only)
6. Django development server starts on port 8000

### Environment Variables

Required in `.env`:
```
POSTGRES_DB=fermi
POSTGRES_USER=fermi
POSTGRES_PASSWORD=fermi
POSTGRES_HOST=database
POSTGRES_PORT=5432
```

## Local Development Setup

### Prerequisites
- Python 3.12+
- PostgreSQL 15+ with PostGIS extension
- Poetry (for dependency management)

### Installation

```bash
cd backend

# Install dependencies
poetry install

# Create environment variables
cp ../.env.example ../.env
# Edit .env with local database credentials

# Apply migrations
python manage.py migrate

# Enable PostGIS
python manage.py shell -c "from django.db import connection; connection.cursor().execute('CREATE EXTENSION IF NOT EXISTS postgis;')"

# Load Fermi-LAT catalog
python manage.py ingest_catalogs --catalogs FERMI

# Start development server
python manage.py runserver
```

## API Endpoints

### Sources
- `GET /api/sources/` - List all sources
- `GET /api/sources/{id}/` - Source details
- `GET /api/sources/region/?ra=...&dec=...&radius=...` - Spatial search
- `GET /api/sources/filter/?catalog=FERMI&search=...` - Search/filter
- `GET /api/sources/{id}/catalog_entries/` - Source's catalog entries

### Catalog Entries
- `GET /api/catalog-entries/` - List all entries
- `GET /api/catalog-entries/{id}/` - Entry details

### Admin
- `GET /admin/` - Django admin interface

## Management Commands

### Ingest catalog data
```bash
# Ingest Fermi catalog
python manage.py ingest_catalogs --catalogs FERMI

# Ingest multiple catalogs
python manage.py ingest_catalogs --catalogs FERMI LHAASO HAWC

# Custom matching radius (degrees)
python manage.py ingest_catalogs --catalogs FERMI --match-radius 0.2

# Clear existing data before ingesting
python manage.py ingest_catalogs --catalogs FERMI --clear
```

## Project Structure

```
backend/
├── app/                    # Django project settings
│   ├── settings.py         # Settings configuration
│   ├── urls.py            # URL routing
│   └── wsgi.py
├── sources/                # Core data models
│   ├── models.py          # Source, CatalogEntry
│   ├── admin.py           # Admin configuration
│   └── migrations/        # Database migrations
├── catalogs/              # Ingestion framework
│   ├── loaders.py         # Catalog loaders
│   ├── crossmatch.py      # Cross-matching service
│   └── management/        # Management commands
├── api/                   # REST API
│   ├── serializers.py     # DRF serializers
│   ├── views.py           # ViewSets
│   └── urls.py            # API routing
├── fermi/                 # Fermi-specific (legacy)
├── data/                  # Downloaded catalog data
├── staticfiles/           # Collected static files
├── manage.py              # Django CLI
├── pyproject.toml         # Poetry configuration
├── poetry.lock            # Locked dependencies
├── Dockerfile             # Container image
├── entrypoint.sh          # Container startup script
└── .dockerignore          # Docker build excludes
```

## Database Schema

### Models
- **Source** - Unified astronomical object across catalogs
  - Spatial index on position (PointField)
  - Tracked by primary_catalog
  - Contains multiple CatalogEntry records

- **CatalogEntry** - Original catalog entry for a Source
  - Links to Source via ForeignKey
  - Stores catalog-specific metadata (JSON)
  - Tracks cross-match confidence

### Indexes
- Source: (ra, dec), (primary_catalog), position (GIST spatial)
- CatalogEntry: (catalog_name), (source_id)

## Spatial Queries

All coordinates use SRID 4326 (standard celestial coordinates, degrees).

Distance calculations use spherical distance on the sky:
- 0.1 degrees ≈ 6 arcminutes (default cross-match radius)
- 1 degree ≈ 60 arcminutes

Example spatial query:
```python
from catalogs.crossmatch import CrossMatchService

service = CrossMatchService(match_radius_deg=0.1)
nearby = service.find_nearby(ra=123.45, dec=-45.67, radius_deg=0.5)

for source in nearby:
    print(f"{source.unified_name}: {source.distance.deg:.3f}°")
```

## Adding New Catalogs

1. Implement loader in `catalogs/loaders.py`:
```python
class MyNewCatalogLoader(CatalogLoader):
    catalog_name = "MYCATALOG"
    
    def load(self) -> List[Dict[str, Any]]:
        # Load and normalize catalog data
        return [
            {
                'name': 'Source1',
                'ra': 123.45,
                'dec': -45.67,
                'metadata': {...}
            }
        ]
```

2. Register in LoaderFactory

3. Ingest:
```bash
python manage.py ingest_catalogs --catalogs MYCATALOG
```

## Testing

```bash
# Run all tests
python -m pytest

# Run specific test
python -m pytest sources/tests/test_models.py

# Run with coverage
python -m pytest --cov=.
```

## Production Deployment

For production use:

1. Update settings:
   - Set `DEBUG = False`
   - Configure `ALLOWED_HOSTS`
   - Use a production SECRET_KEY
   - Configure a production database

2. Use a production WSGI server (e.g., Gunicorn):
   ```bash
   gunicorn app.wsgi:application --bind 0.0.0.0:8000
   ```

3. Set up static file serving (e.g., nginx)

4. Enable HTTPS/TLS

5. Set up proper logging and monitoring

## Troubleshooting

### PostGIS Extension Not Available
```bash
# In PostgreSQL shell
CREATE EXTENSION IF NOT EXISTS postgis;
SELECT PostGIS_Version();
```

### Migration Errors
```bash
# Reset migrations (development only)
python manage.py migrate sources zero
python manage.py migrate
```

### No catalog data loaded
1. Verify FITS files exist in `data/` directory
2. Check permissions on `data/` directory
3. Run ingest command manually for verbose output

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Change port in docker-compose.yml or runserver command
python manage.py runserver 0.0.0.0:8001
```

## Performance Optimization

- Spatial queries are indexed via GIST - efficient for up to thousands of sources
- Use `--match-radius 0.05` for tighter matching (faster ingestion)
- Pagination defaults to 50 sources per page
- ViewSets use `prefetch_related` to avoid N+1 queries

## Support & Documentation

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [GeoDjango Documentation](https://docs.djangoproject.com/en/stable/ref/contrib/gis/)
- [PostGIS Documentation](https://postgis.net/documentation/)

## License

[Your License Here]
