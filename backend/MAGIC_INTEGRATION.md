# MAGIC Source Simulator Integration

## Overview

The MAGIC Source Simulator (MSS) integration enables prediction of Very High Energy (VHE) gamma-ray source detectability by the MAGIC telescopes. Sources are analyzed during catalog ingestion (on-load calculation) and can be re-analyzed on-demand with custom observation parameters via REST API.

## Key Features

- **On-load calculation**: During catalog ingestion, sources with complete spectral data are automatically analyzed with default parameters (20 hours observation, low zenith angle)
- **Graceful degradation**: Sources without complete spectral data save successfully without blocking ingestion
- **On-demand simulation**: Users can request fresh MAGIC simulations with custom observation parameters
- **Optional fields**: MAGIC statistics are stored as optional nullable fields, so sources display even without MAGIC data

## Database Schema

### CatalogEntry MAGIC Fields

Four nullable fields store MAGIC simulation results:

```python
magic_significance: FloatField(null=True, blank=True)
# Li&Ma 1983 statistical significance in sigma units
# null if calculation was skipped (incomplete spectral data)
# Example: 127.26 (detected with very high significance)

magic_detectable: BooleanField(null=True, blank=True)
# true if significance >= 5σ (detectable), false if lower
# null if not calculated
# Example: true

magic_calculated_at: DateTimeField(null=True, blank=True)
# UTC timestamp when calculation was performed
# null if not calculated
# Example: "2026-05-11T21:15:29.379534Z"

magic_params_hash: CharField(null=True, blank=True)
# MD5 hash of observation parameters (for reproducibility)
# null if not calculated
# Example: "93fed4a38207d5a290e237d9103783d7"
```

## REST API Endpoints

### 1. Get Source with Pre-calculated MAGIC Data

**Endpoint**: `GET /api/sources/{id}/`

Returns the unified source with all catalog entries and their pre-calculated MAGIC data.

**Example Request**:
```bash
curl -s http://localhost:8000/api/sources/23525/ | python3 -m json.tool
```

**Example Response**:
```json
{
  "id": 23525,
  "unified_name": "1LHAASO J0007+5659u",
  "ra": 1.86,
  "dec": 57.0,
  "primary_catalog": "LHAASO",
  "catalog_entries": [
    {
      "id": 25065,
      "catalog_name": "LHAASO",
      "original_name": "1LHAASO J0007+5659u",
      "magic_significance": 32.70117285052118,
      "magic_detectable": true,
      "magic_calculated_at": "2026-05-11T21:15:29.379534Z",
      "magic_params_hash": "93fed4a38207d5a290e237d9103783d7",
      "metadata": {
        "flux_tev": 3.3e-17,
        "spectral_index": 3.1,
        ...
      }
    }
  ]
}
```

### 2. Run On-Demand MAGIC Simulation

**Endpoint**: `GET /api/sources/{id}/magic_simulation/`

Runs a fresh MAGIC simulation with user-specified observation parameters. Returns detailed energy-binned results suitable for plotting.

**Query Parameters** (all optional):

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `zenith_angle` | string | `low` | `low`, `mid`, `high` | Observation zenith angle (0-30°, 30-45°, ~60°) |
| `observation_time_hours` | float | `20` | 0.1-10000 | Hours of observation |
| `psf_deg` | float | `0.1` | 0-1 | Point spread function size (degrees) |
| `extension_deg` | float | `0.0` | 0-1 | Source extension radius (degrees) |
| `offset_degrad` | float | `1.0` | 0.01-1 | Performance degradation for off-axis (0=worst, 1=on-axis) |
| `num_off_regions` | int | `3` | 1-7 | Number of background estimation regions |
| `min_events` | int | `10` | 1-1000 | Minimum excess events for detection threshold |
| `min_sbr` | float | `0.05` | 0-1 | Minimum signal-to-background ratio |

**Example Requests**:

```bash
# Default parameters (20h, low zenith)
curl -s http://localhost:8000/api/sources/23525/magic_simulation/

# Custom: mid zenith, 50 hours observation
curl -s "http://localhost:8000/api/sources/23525/magic_simulation/?zenith_angle=mid&observation_time_hours=50"

# High zenith, extended source, longer observation
curl -s "http://localhost:8000/api/sources/23525/magic_simulation/?zenith_angle=high&observation_time_hours=100&extension_deg=0.5"
```

**Success Response** (HTTP 200):

```json
{
  "source": {
    "id": 23525,
    "unified_name": "1LHAASO J0007+5659u",
    "ra": 1.86,
    "dec": 57.0,
    "primary_catalog": "LHAASO"
  },
  "catalog_entry": {
    "original_name": "1LHAASO J0007+5659u",
    "catalog_name": "LHAASO",
    "confidence": 1.0,
    "discovery_method": "gamma-ray (LHAASO)"
  },
  "energy_bins": [100, 150, 220, 330, 500, 700, 1000, 1500, ...],
  "spectral_points": [
    {
      "energy_gev": 100,
      "flux": 1.23e-13,
      "flux_err": 2.1e-14
    },
    ...
  ],
  "aggregate_stats": {
    "total_significance": 32.70117285052118,
    "min_observation_time_hours": 12.5,
    "total_signal_events": 450,
    "total_background_events": 320,
    "signal_to_background_ratio": 1.4,
    "detection_threshold_events": 10
  },
  "observation_parameters": {
    "zenith_angle": "mid",
    "observation_time_hours": 50,
    "psf_deg": 0.1,
    "extension_deg": 0.0,
    "offset_degrad": 1.0,
    "num_off_regions": 3,
    "min_events": 10,
    "min_sbr": 0.05
  }
}
```

**Pre-calculated Data Response** (HTTP 200 - when spectral data unavailable but pre-calculated data exists):

```json
{
  "source": { ... },
  "catalog_entry": { ... },
  "pre_calculated_magic": {
    "magic_significance": 32.70117285052118,
    "magic_detectable": true,
    "magic_calculated_at": "2026-05-11T21:15:29.379534Z",
    "observation_params": {
      "observation_time_hours": 20,
      "zenith_angle": "low",
      "note": "Default parameters used during catalog ingestion"
    }
  },
  "note": "Spectral data incomplete for on-demand calculation. Showing pre-calculated results from catalog ingestion."
}
```

**Error Response - No Spectral Data** (HTTP 400):

```json
{
  "error": "Source lacks complete spectral data (need spectral_index and flux) and has no pre-calculated MAGIC statistics."
}
```

**Error Response - Invalid Parameter** (HTTP 400):

```json
{
  "error": "Invalid 'zenith_angle': expected 'low', 'mid', or 'high'"
}
```

**Error Response - Source Not Found** (HTTP 404):

```json
{
  "error": "Not found."
}
```

**Error Response - Simulation Failure** (HTTP 500):

```json
{
  "error": "Simulation failed: [error details]"
}
```

## Data Returned

### Energy Bins
Standardized energy bins in GeV covering the MAGIC sensitivity range:
```
[100, 150, 220, 330, 500, 700, 1000, 1500, 2200, 3300, 5000, 7000, 10000]
```

### Spectral Points
Energy-binned flux measurements:
- `energy_gev`: Central energy of bin (GeV)
- `flux`: Integrated flux in bin (cm⁻² s⁻¹)
- `flux_err`: Statistical uncertainty on flux

### Aggregate Statistics
Overall simulation results:
- `total_significance`: Li&Ma 1983 significance (σ units)
  - ≥ 5σ = detectable with high confidence
  - < 5σ = marginal or non-detectable
- `min_observation_time_hours`: Time required to reach `min_events` detection threshold
- `total_signal_events`: Excess events from source
- `total_background_events`: Background events in source region
- `signal_to_background_ratio`: S/B ratio for significance calculation
- `detection_threshold_events`: Minimum events required (from `min_events` parameter)

## Spectral Data Requirements

### Automatic Spectral Extraction

The API automatically extracts spectral information from catalog metadata:

**Supported Formats**:

1. **Power-law spectrum** (most common):
   ```
   flux_at_energy_tev: value (TeV cm⁻² s⁻¹)
   spectral_index: value (2.0-3.5 typical)
   ```
   → Flux(E) = N × (E / E₀)^(-Γ)

2. **Power-law with exponential cutoff**:
   ```
   flux_at_energy_tev: value
   spectral_index: value
   cutoff_energy_tev: value (optional)
   ```
   → Flux(E) = N × (E / E₀)^(-Γ) × exp(-E / E_c)

**Catalog-Specific Keys** (automatically detected):

| Catalog | Flux Key | Index Key | Notes |
|---------|----------|-----------|-------|
| FERMI | `flux1000` | `spectral_index` | Flux at 1 GeV |
| LHAASO | `flux_tev` | `spectral_index` | Flux at 1 TeV |
| HAWC | `flux_tev` | `spectral_index` | Flux at 7 TeV |
| TeVCat | Various | `spectral_index` | Flux in Crab units |

**Incomplete Data Handling**:
- If either flux or spectral_index is missing → calculation skipped
- Source still saves to database with `NULL` MAGIC fields
- On-demand endpoint returns pre-calculated data if available, or 400 error

## Frontend Integration Examples

### Display Pre-calculated MAGIC Data

```javascript
// In source detail view
fetch(`/api/sources/${sourceId}/`)
  .then(r => r.json())
  .then(source => {
    const primaryEntry = source.catalog_entries.find(
      e => e.catalog_name === source.primary_catalog
    );
    
    if (primaryEntry?.magic_significance !== null) {
      const sig = primaryEntry.magic_significance;
      const detectable = primaryEntry.magic_detectable;
      const calcTime = primaryEntry.magic_calculated_at;
      
      console.log(`MAGIC Significance: ${sig.toFixed(2)}σ`);
      console.log(`Detectable: ${detectable ? 'Yes' : 'No'}`);
      console.log(`Calculated: ${new Date(calcTime).toLocaleString()}`);
    } else {
      console.log('MAGIC data not available for this source');
    }
  });
```

### Request On-Demand Simulation

```javascript
async function runMAGICSimulation(sourceId, params = {}) {
  const queryParams = new URLSearchParams({
    zenith_angle: params.zenithAngle || 'low',
    observation_time_hours: params.obsTime || 20,
    psf_deg: params.psfDeg || 0.1,
    extension_deg: params.extensionDeg || 0.0,
    offset_degrad: params.offsetDegrad || 1.0,
    num_off_regions: params.numOffRegions || 3,
    min_events: params.minEvents || 10,
    min_sbr: params.minSbr || 0.05,
  });
  
  const response = await fetch(
    `/api/sources/${sourceId}/magic_simulation/?${queryParams}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Simulation failed:', error.error);
    return null;
  }
  
  return await response.json();
}
```

### Plot Spectral Points

```javascript
// Using a plotting library (e.g., Chart.js, Plotly)
const simulationData = await runMAGICSimulation(sourceId);

if (simulationData?.spectral_points) {
  const chartData = {
    labels: simulationData.spectral_points.map(p => p.energy_gev),
    datasets: [{
      label: 'MAGIC Spectral Points',
      data: simulationData.spectral_points.map(p => ({
        x: p.energy_gev,
        y: p.flux,
        error: p.flux_err
      })),
      borderColor: 'rgb(75, 192, 192)',
      fill: false
    }]
  };
  
  // Render chart...
}
```

### Display Detectability Status

```javascript
function getDetectabilityStatus(significance) {
  if (significance === null) {
    return { status: 'unknown', label: 'Not Calculated', color: 'gray' };
  }
  if (significance >= 10) {
    return { status: 'excellent', label: `${significance.toFixed(1)}σ - Excellent`, color: 'green' };
  }
  if (significance >= 5) {
    return { status: 'detectable', label: `${significance.toFixed(1)}σ - Detectable`, color: 'blue' };
  }
  if (significance >= 3) {
    return { status: 'marginal', label: `${significance.toFixed(1)}σ - Marginal`, color: 'orange' };
  }
  return { status: 'undetectable', label: `${significance.toFixed(1)}σ - Not Detectable`, color: 'red' };
}

// Usage:
const status = getDetectabilityStatus(primaryEntry?.magic_significance);
console.log(`Detection Status: ${status.label}`);
```

## Ingestion Statistics

During `docker compose exec backend python manage.py ingest_catalogs`:

```
[→] Loading FERMI...
    Found 5788 sources
  MAGIC: 5857 calculated, 403 skipped (incomplete data)
[✓] FERMI: 5788 new, 0 cross-matched

[→] Loading LHAASO...
    Found 76 sources
  MAGIC: 76 calculated, 0 skipped (incomplete data)
[✓] LHAASO: 60 new, 16 cross-matched

[→] Loading HAWC...
    Found 60 sources
  MAGIC: 10 calculated, 50 skipped (incomplete data)
[✓] HAWC: 10 new, 50 cross-matched
```

## Significance Interpretation

Li&Ma 1983 significance quantifies the statistical confidence of a detection:

| Significance | Interpretation |
|--------------|-----------------|
| < 3σ | Not significant; background fluctuation |
| 3-5σ | Marginal detection; requires confirmation |
| 5-10σ | Significant detection |
| > 10σ | Highly significant; confirmed detection |

Default detectability threshold: **5σ** (field `magic_detectable = true`)

## Performance Notes

- **On-load calculations**: ~1-2 seconds per source (typical, depends on spectrum complexity)
- **On-demand simulations**: ~0.5-1 second per request
- **Database queries**: Pre-calculated data loaded from cache; minimal latency

## Error Handling

The endpoint implements comprehensive error handling:

1. **Missing source** → HTTP 404
2. **Invalid query parameters** → HTTP 400 with parameter-specific message
3. **No spectral data + no pre-calculated results** → HTTP 400 with helpful message
4. **Simulation runtime error** → HTTP 500 with exception details

Always check the HTTP status code and `error` field in JSON response before processing data.

## Future Enhancements

Potential improvements for future iterations:

- Batch simulation endpoint for multiple sources
- Time-dependent observations (seasonal effect)
- Multi-epoch sensitivity curves
- Background-only observations for limit calculation
- Flux upper limit computation for non-detections
