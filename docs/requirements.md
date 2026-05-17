# Requirements — Fermi Gamma-Ray Observatory

Requirements derived from project documentation (`docs/`) and source code analysis.

---

## Functional Requirements

### FR-01 – FR-10: Catalog Ingestion

- **FR-01**: The system must ingest gamma-ray source data from four astronomical catalogs: Fermi-LAT 4FGL, HAWC 3HWC, LHAASO 1LHAASO DR1, and TeVCat.
- **FR-02**: The system must download catalog files in FITS, YAML, and TAP/HEASARC formats and cache them locally.
- **FR-03**: The system must cross-match sources across multiple catalogs using spatial proximity queries.
- **FR-04**: The system must support selective re-ingestion of individual catalogs with optional data clearing.
- **FR-05**: The system must support configurable cross-match radius (default: 0.1°).
- **FR-06**: The system must assign a cross-match confidence score (0.0–1.0) to each catalog entry.
- **FR-07**: The system must support configurable `n_sigma_match` threshold (default: 2.5σ) during cross-matching.
- **FR-08**: The system must extract position errors from source metadata (circular and elliptical formats) and use them to dynamically adjust the match radius, falling back to a conservative default when error info is missing.
- **FR-09**: The system must support two confidence calculation methods: `gaussian` (default) and `mahalanobis`.
- **FR-10**: The system must pre-calculate MAGIC simulation results for each ingested source with complete spectral data and store them in the catalog entry metadata, silently skipping sources with incomplete spectra.

### FR-11 – FR-18: Data Model & Storage

- **FR-11**: The system must store unified astronomical sources with equatorial coordinates (RA/Dec, J2000 ICRS).
- **FR-12**: The system must store catalog-specific entries linked to their unified source, including original name, detection method, and metadata (flux, spectrum, classification).
- **FR-13**: The system must store spectral energy distribution (SED) points for Fermi-LAT sources.
- **FR-14**: The system must prefer the primary catalog's entry when extracting metadata fields (source class, significance, flux), falling back to the first available entry.
- **FR-15**: The system must calculate `avg_confidence` (arithmetic mean) and `best_confidence` (maximum) across all catalog entries for a source, both rounded to 4 decimal places, returning `None` if no entries exist.
- **FR-16**: The system must include an angular separation `distance` field (in degrees) in source responses returned from spatial queries.
- **FR-17**: The system must detect MAGIC-observable sources using a threshold of significance ≥ 5σ, storing `magic_significance`, `magic_detectable`, `magic_calculated_at`, and `magic_params_hash` per entry.
- **FR-18**: The system must store an MD5 hash of MAGIC observation parameters to support reproducibility.

### FR-19 – FR-35: REST API

- **FR-19**: The system must provide a paginated list of sources with support for text search, ordering, and catalog filtering (default page size: 50, max: 1,000).
- **FR-20**: The system must provide a source detail endpoint returning the source with nested catalog entries.
- **FR-21**: The system must support spatial cone search by RA, Dec, and radius (default radius: 0.5°).
- **FR-22**: The system must support advanced filtering by catalog, source class, coordinate range (RA/Dec), confidence, significance, flux, and minimum catalog count.
- **FR-23**: The `source_class` filter must support multiple values simultaneously (OR logic) and match case-insensitively against catalog entry metadata.
- **FR-24**: The system must provide an analytics endpoint returning catalog comparison data, detection trends, and a significance histogram.
- **FR-25**: The significance histogram must use 15 log-spaced bins covering 10⁰ to 10⁴ (1σ to 10,000σ), with per-catalog counts and percentages; non-positive significance values must be silently skipped.
- **FR-26**: The system must provide a map-ready `analytics_map` endpoint with support for spatial and temporal bounding.
- **FR-27**: The `analytics_map` endpoint must include additional metadata in every response: `spatialBounds` (min/max RA/Dec), `dateBounds` (discovery date range), `catalogDistribution` (source count per catalog), and `filtersApplied` (echo of submitted filters).
- **FR-28**: The system must expose all catalog entries for a given source via a dedicated sub-resource endpoint.
- **FR-29**: The system must expose a Django admin interface for superuser management.
- **FR-30**: The system must accept `discovery_date_start`/`discovery_date_end` in both ISO datetime (`2026-05-16T12:00:00Z`) and ISO date (`2026-05-16`) formats, expanding bare dates to inclusive day ranges, converting naive datetimes to UTC, and returning HTTP 400 for invalid formats.
- **FR-31**: The system must validate `ra`/`ra_min`/`ra_max` to [0°, 360°], `dec`/`dec_min`/`dec_max` to [−90°, +90°], cone search `radius` to (0°, 180°], `confidence_min`/`confidence_max` to [0, 1] (including min ≤ max check), and `min_catalog_count` to integer ≥ 1; all violations must return HTTP 400 with a descriptive error message.
- **FR-32**: The system must provide a `GET /api/sources/{id}/magic_simulation/` endpoint for on-demand MAGIC telescope simulation.
- **FR-33**: The MAGIC simulation endpoint must accept 8 optional parameters: `zenith_angle` (low/mid/high), `observation_time_hours` (0.1–10,000, default 20 h), `psf_deg` (0–1, default 0.1), `extension_deg` (0–1, default 0), `offset_deg` (0.01–1, default 1), `num_off_regions` (1–7, default 3), `min_events` (1–1,000, default 10), `min_sbr` (0–1, default 0.05).
- **FR-34**: The MAGIC simulation endpoint must return pre-calculated results (HTTP 200) when live spectrum data is unavailable, and HTTP 400 when neither live nor pre-calculated data is available.
- **FR-35**: The MAGIC simulation endpoint must augment its response with source metadata and the matching catalog entry.

### FR-36 – FR-43: Scoring & Analytics Calculations

- **FR-36**: The system must calculate a detectability score using the formula: `score = significance × 5.0 + log10(flux × 1e13 + 1.0) × 6.0 + confidence × 40.0`, clamped to [0, 100].
- **FR-37**: The system must classify sources into detectability tiers: high (≥ 70), medium (40–69), low (< 40), and return per-tier counts in analytics responses.
- **FR-38**: The system must calculate the 95th percentile of significance values (`p95Significance`) per catalog in the analytics endpoint.
- **FR-39**: The system must return per-catalog analytics rows including: source count, average flux, average significance, average confidence, average catalog count, multi-catalog share, and P95 significance.

### FR-40 – FR-48: Frontend — Catalog Browser

- **FR-40**: The system must provide a filterable and sortable data table of unified sources.
- **FR-41**: The system must allow filtering by: name (text, partial, case-insensitive), primary catalog (multi-select), source class (multi-select, OR logic), RA range (0°–360°), Dec range (−90°–+90°), significance (min/max), flux (min/max), confidence (min/max), and minimum catalog count.
- **FR-42**: The system must display active filters as removable badges and provide a "Clear all" option.
- **FR-43**: The system must retain the previously fetched data in the sources table while a new filtered query is loading, preventing blank/flash states.
- **FR-44**: The system must display a source detail page showing coordinates (to 4 decimal places), primary catalog, catalog count, and all catalog entries with their original name, detection method, and confidence score.
- **FR-45**: The system must allow the user to return to the source list from the detail view, preserving previous filter and page state.

### FR-46 – FR-57: Frontend — Analytics Dashboard

- **FR-46**: The system must display a 2D sky map of all sources in the selected catalogs.
- **FR-47**: The system must support switching between Aitoff (default), Mollweide, equirectangular, and orthographic map projections.
- **FR-48**: The system must support switching between Equatorial (RA/Dec) and Galactic (l/b) coordinate systems.
- **FR-49**: The system must support zoom (up to 12×) and pan on the sky map.
- **FR-50**: The system must display a tooltip with source name, coordinates, and significance on sky map hover.
- **FR-51**: The system must support a cone search on the sky map by center position and radius, restricting the visible area to that sky region.
- **FR-52**: The system must display headline metrics: total sources, average significance, average flux, average confidence, and multi-catalog share percentage.
- **FR-53**: The system must display four charts: Catalog Comparison (bar), Catalog Coverage (bar), Class Mix (stacked bar), and Significance Histogram (per-catalog, log-spaced bins).
- **FR-54**: The system must display a top sources table ranked by composite detectability score, showing name, catalog, class, significance, flux, confidence, catalog count, and score.
- **FR-55**: The system must support grouping analytics by catalog, source class, discovery method, confidence band, and catalog count band.
- **FR-56**: The analytics dashboard must load all sources in pages of 1,000 items until all data is retrieved.
- **FR-57**: The sky map query cache must expire after 1 minute (shorter than the global 5-minute default).

### FR-58 – FR-65: Frontend — 3D Universe Map

- **FR-58**: The system must render an interactive 3D celestial sphere displaying all sources as points.
- **FR-59**: The system must automatically cluster nearby sources at low zoom levels using the HEALPix NESTED scheme (up to order 6, 4,096 sky pixels), assigning each cluster the color of its dominant catalog.
- **FR-60**: The system must resolve clusters into individual source points as the user zooms in.
- **FR-61**: The status bar must show live counts: Clusters / Points / Shown / Total.
- **FR-62**: The system must display a source detail panel on point click, showing name, coordinates, class, flux, significance, spectral index, and confidence.
- **FR-63**: The system must support filtering visible sources per catalog via a checkbox panel.
- **FR-64**: The system must render an animated background of 600 cosmic particles with individual velocity, sinusoidal pulsing, and 8 preset colors.

### FR-65 – FR-66: Internationalization

- **FR-65**: The system must support English and Polish languages throughout the UI, with the active language persisted in `localStorage` (falling back to English if storage is unavailable).
- **FR-66**: The system must display a language switcher in the navigation bar; on mobile, navigation must collapse into a hamburger menu.

---

## Non-Functional Requirements

### Performance

- **NFR-01**: The REST API must support a default page size of 50 and a maximum page size of 1,000 per request.
- **NFR-02**: The frontend must cache API responses for 5 minutes globally before marking them stale, except the sky map query which must use a 1-minute stale time.
- **NFR-03**: Failed API requests must be retried exactly once; refetching on browser window focus must be disabled.
- **NFR-04**: The 3D Universe Map must support loading and displaying up to 20,000 sources (100 pages × 200 items).

### Startup & Reliability

- **NFR-05**: The backend service must not start until the database passes a `pg_isready` health check (interval: 10 s, timeout: 5 s, retries: 5).
- **NFR-06**: The frontend service must not start until the backend passes an HTTP health check (interval: 5 s, timeout: 5 s, retries: 5).
- **NFR-07**: The backend must become available within 180 seconds on first run, accounting for catalog download and ingestion time.

### Data Persistence

- **NFR-08**: PostgreSQL data must persist across container restarts using a named Docker volume (`postgres-data`).

### Spatial Indexing

- **NFR-09**: The system must use PostGIS GIST spatial indexes on the `position` (PointField, SRID 4326) column to support efficient cone search queries.
- **NFR-10**: The system must maintain composite database indexes on `(ra, dec)` and a single index on `primary_catalog` for filtering performance.

### Time & Locale

- **NFR-11**: All datetimes must be stored and processed as UTC-aware (`TIME_ZONE = "UTC"`, `USE_TZ = True`); naive datetime inputs must be converted to UTC automatically.

### Accessibility & Usability

- **NFR-12**: The application must be accessible without user authentication or account registration.
- **NFR-13**: The navigation must be responsive and accessible on mobile devices via a collapsible hamburger menu.

### Deployability

- **NFR-14**: The entire stack (backend, frontend, database) must be deployable with a single `docker compose up -d --build` command.
- **NFR-15**: The system must be configurable entirely via environment variables defined in a single `.env` file at the repository root.

### Security (pre-production)

- **NFR-16**: Before any public deployment, `SECRET_KEY` must be rotated to a strong random value, `DEBUG` must be set to `False`, and `ALLOWED_HOSTS` must be restricted to known domains.
