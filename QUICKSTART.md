# Quick Start Guide: Astronomy Catalog Backend

## 1. Database Setup

```bash
# Ensure PostgreSQL and PostGIS extension are enabled
psql fermi -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Apply migrations
python manage.py migrate

# Verify PostGIS installation
psql fermi -c "SELECT PostGIS_Version();"
```

## 2. Load Catalog Data

### Load Fermi-LAT catalog (complete implementation)
```bash
python manage.py ingest_catalogs --catalogs FERMI
```

### Load all available catalogs
```bash
python manage.py ingest_catalogs --catalogs FERMI LHAASO HAWC TEVCAT NED
```

### Customize matching radius (default 0.1 degrees)
```bash
python manage.py ingest_catalogs --catalogs FERMI --match-radius 0.2
```

### Clear existing data before reload
```bash
python manage.py ingest_catalogs --catalogs FERMI --clear
```

## 3. Access the API

### List all sources (paginated)
```bash
curl http://localhost:8000/api/sources/
```

### Get source details with catalog entries
```bash
curl http://localhost:8000/api/sources/1/
```

### Query by sky region (spatial search)
```bash
# Sources within 0.5 degrees of RA=123.45, DEC=-45.67
curl "http://localhost:8000/api/sources/region/?ra=123.45&dec=-45.67&radius=0.5"
```

### Search and filter
```bash
# Fermi sources with "3C" in the name
curl "http://localhost:8000/api/sources/filter/?catalog=FERMI&search=3C279"

# Sources with high cross-match confidence
curl "http://localhost:8000/api/sources/filter/?confidence_min=0.95"
```

### Get catalog entries for a source
```bash
curl http://localhost:8000/api/sources/1/catalog_entries/
```

### Browse all catalog entries
```bash
curl "http://localhost:8000/api/catalog-entries/?catalog_name=FERMI"
```

## 4. Django Admin

Navigate to http://localhost:8000/admin/ and log in:
- View/search unified Sources
- Browse catalog entries inline
- Filter by catalog or catalog
- Edit metadata directly

## 5. Extend with New Catalogs

### Add a new catalog loader

1. Edit `catalogs/loaders.py`:

```python
class MyNewCatalogLoader(CatalogLoader):
    catalog_name = "MYCATALOG"
    
    def load(self) -> List[Dict[str, Any]]:
        # 1. Load your catalog data (FITS, CSV, API, etc.)
        # 2. Normalize to standard format
        # 3. Return list of dicts with keys: name, ra, dec, metadata
        
        return [
            {
                'name': 'Source1',
                'ra': 123.45,
                'dec': -45.67,
                'metadata': {
                    'flux': 0.123,
                    'energy_range': '1-100 TeV',
                    # ... catalog-specific fields
                }
            },
            # ... more sources
        ]
```

2. Update `LoaderFactory._loaders` to register your loader:

```python
_loaders = {
    # ... existing loaders ...
    "MYCATALOG": MyNewCatalogLoader,
}
```

3. Ingest your catalog:

```bash
python manage.py ingest_catalogs --catalogs MYCATALOG
```

## 6. Architecture Quick Reference

### Three Django Apps

| App | Purpose | Key Files |
|-----|---------|-----------|
| **sources** | Core data models | models.py (Source, CatalogEntry) |
| **catalogs** | Data ingestion & cross-matching | loaders.py, crossmatch.py |
| **api** | REST endpoints | serializers.py, views.py, urls.py |

### Data Flow

```
[External Catalogs]
        ↓
    [Loaders] (catalogs/loaders.py)
        ↓
[CrossMatchService] (catalogs/crossmatch.py)
        ↓
    [Source + CatalogEntry] (sources/models.py)
        ↓
    [REST API] (api/views.py)
```

### Spatial Queries

All spatial queries use PostGIS with SRID=4326 (celestial coordinates):
- PointField on Source.position stores RA/DEC as geographic point
- GIST spatial index enables efficient range queries
- Distance calculations use spherical distance (degrees on sky)

## 7. Common Tasks

### Find nearby sources programmatically

```python
from catalogs.crossmatch import CrossMatchService

service = CrossMatchService(match_radius_deg=0.1)
nearby = service.find_nearby(ra=123.45, dec=-45.67, radius_deg=0.5)

for source in nearby:
    print(f"{source.unified_name}: {source.distance.deg:.3f}°")
```

### Cross-match new sources

```python
from catalogs.crossmatch import CrossMatchService

service = CrossMatchService()
source = service.match_or_create(
    name="NewSource",
    ra=100.0,
    dec=30.0,
    catalog_name="FERMI",
    original_name="4FGL J0640.0+3015",
    metadata={"flux": 0.123, "class": "FSRQ"}
)
```

### Query via ORM

```python
from sources.models import Source

# Find brightest sources (by assuming metadata 'flux' value)
# Note: JSON queries depend on database - example with PostgreSQL
sources = Source.objects.filter(
    primary_catalog="FERMI"
).order_by("created_at")[:10]

# Access catalog entries
for source in sources:
    for entry in source.catalog_entries.all():
        print(f"{source.unified_name} in {entry.catalog_name}")
```

## 8. Troubleshooting

### PostGIS not installed
```bash
# For Docker/local PostgreSQL
psql fermi -c "CREATE EXTENSION postgis;"
```

### Migration errors
```bash
# Reset migrations (development only!)
python manage.py migrate sources zero
python manage.py migrate
```

### No sources loaded
1. Check if Fermi FITS file exists: `ls backend/data/gll_psc_v*.fit`
2. Check for download errors: `python manage.py ingest_catalogs --catalogs FERMI`
3. Verify cross-match service is working with test query

## 9. Performance Tips

- Use `--match-radius 0.05` for tighter matching (faster ingestion, fewer false matches)
- Pagination default is 50 sources - adjust via REST_FRAMEWORK settings
- Spatial queries are indexed via GIST - queries with large radius may scan more data
- Use `prefetch_related` in ViewSets to avoid N+1 queries (already implemented)

## 10. Next Steps

- [ ] Complete LHAASO, HAWC, TeVCat, NED loaders
- [ ] Add comprehensive tests (models, loaders, API)
- [ ] Set up CI/CD pipeline for automated ingestion
- [ ] Add OpenAPI documentation
- [ ] Consider caching layer for frequently accessed regions
- [ ] Add data versioning/history tracking
