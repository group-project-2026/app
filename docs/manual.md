# User Manual — Gamma-Ray Observatory

A web application for exploring and analysing high-energy gamma-ray sources aggregated from multiple astronomical catalogs: **Fermi-LAT 4FGL**, **HAWC 3HWC**, **LHAASO**, and **TeVCat**.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Navigation](#2-navigation)
3. [Home Page](#3-home-page)
4. [Sources — Catalog Browser](#4-sources--catalog-browser)
   - [Filters](#filters)
   - [Results Table](#results-table)
   - [Source Detail View](#source-detail-view)
5. [Analytics Dashboard](#5-analytics-dashboard)
   - [Sky Map](#sky-map)
   - [Analysis Scope](#analysis-scope)
   - [Headline Metrics](#headline-metrics)
   - [Charts](#charts)
   - [Top Sources Table](#top-sources-table)
6. [Universe Map — 3D View](#6-universe-map--3d-view)
   - [Controls](#controls)
   - [Filters and Legend](#filters-and-legend)
   - [Source Detail Panel](#source-detail-panel)
7. [Data Reference](#7-data-reference)
   - [Catalogs](#catalogs)
   - [Source Classes](#source-classes)
   - [Field Definitions](#field-definitions)
8. [Language](#8-language)

---

## 1. Getting Started

Open your browser and navigate to **http://localhost:3000**.

The application loads catalog data automatically on startup. On the very first run the backend downloads and ingests data from all four catalogs, which may take a few minutes. The interface becomes available as soon as ingestion is complete.

No account or login is required — the application is publicly accessible.

---

## 2. Navigation

The top navigation bar is always visible. It contains four links:

| Link | Page | What you find there |
|------|------|---------------------|
| **Home** | `/` | Overview and quick access cards |
| **Universe Map** | `/universe-map` | Interactive 3D celestial sphere |
| **Analytics** | `/source-analytics` | Statistical dashboard and sky map |
| **Sources** | `/sources` | Full searchable and filterable source catalog |

On mobile devices the navigation collapses into a hamburger menu (top-right corner). Tap it to expand the link list.

The currently active page is highlighted with a light-blue indicator.

Use the **language switcher** (top-right on desktop) to toggle between English and Polish.

---

## 3. Home Page

The home page gives a quick overview of the application:

- **Feature cards** — click *Open* on any card to jump directly to the Universe Map, Sources browser, or Analytics dashboard.
- **Quick stats** — headline numbers showing the total number of catalogs integrated, sources available, source classes, and visualisation modes.

---

## 4. Sources — Catalog Browser

Navigate to **Sources** to browse the full list of unified gamma-ray sources.

### Filters

Click **Filters** to expand the filter panel. You can combine any number of filters simultaneously. Active filters are shown as removable badges — click the × on a badge to remove that single constraint, or click **Clear all** to reset everything.

| Filter | Type | Description |
|--------|------|-------------|
| **Search** | Text | Match against source name (partial, case-insensitive) |
| **Primary Catalog** | Multi-select | Restrict to sources whose primary catalog is one of: FERMI, LHAASO, HAWC, TEVCAT |
| **Source Class** | Multi-select | Filter by object type: PSR, PWN, SNR, AGN, FSRQ, BLL, BCU, UNK |
| **RA Range** | Slider (0°–360°) | Right Ascension bounds |
| **Dec Range** | Slider (−90°–+90°) | Declination bounds |
| **Significance** | Min / Max number | Detection significance in the source catalog |
| **Flux** | Min / Max number | Integrated photon flux above 1 GeV (ph cm⁻² s⁻¹) |
| **Confidence** | Min / Max (0–1) | Cross-match confidence score |
| **Min Catalog Count** | Number | Show only sources appearing in at least *n* catalogs |

Applying a filter immediately refreshes the table and resets the page to 1.

### Results Table

The table shows up to 100 sources per page by default. Use the page-size selector (bottom-right) to switch to 10, 25, or 50 rows per page. Navigate between pages with the **Previous / Next** buttons.

Click any **column header** to sort by that column (click again to reverse the order).

| Column | Description |
|--------|-------------|
| **Source Name** | Unified name assigned during cross-matching |
| **Primary Catalog** | The catalog from which this source was first ingested |
| **RA** | Right Ascension (degrees, J2000) |
| **Dec** | Declination (degrees, J2000) |
| **Catalog Count** | Number of catalogs in which this source appears |
| **Source Class** | Astrophysical object class (PSR, AGN, SNR, etc.) |
| **Associated Name** | Counterpart name from the original catalog |
| **Discovery Method** | Detection method (e.g. gamma-ray) |
| **Significance** | Detection significance |
| **Flux1000** | Photon flux above 1 GeV (ph cm⁻² s⁻¹, scientific notation) |
| **Spectral Index** | Power-law photon index |
| **Avg Confidence** | Mean cross-match confidence across all catalog entries |
| **Best Confidence** | Maximum cross-match confidence across catalog entries |

Click any row to open the **Source Detail View** for that source.

### Source Detail View

The detail page shows two sections:

**Source Information**
- Unified source name, primary catalog, equatorial coordinates (RA/Dec to 4 decimal places), total catalog count, and distance (if available).

**Catalog Entries**
- A table listing every catalog in which this source appears, with its original name in that catalog, the detection method, and the cross-match confidence score.

Use the **Back to Sources** button (top-left) to return to the list, preserving your previous filters and page position.

---

## 5. Analytics Dashboard

Navigate to **Analytics** for a statistical overview of the aggregated catalog data.

### Sky Map

At the top of the page a 2D sky map displays all sources in the currently selected catalogs. You can:

- **Switch projection** — choose between Aitoff (default), Mollweide, equirectangular, and orthographic from the dropdown.
- **Switch coordinate system** — toggle between Equatorial (RA/Dec) and Galactic (l/b) coordinates.
- **Pan and zoom** — scroll to zoom (up to 12×); click and drag to pan.
- **Hover** over a point to see the source name, coordinates, and significance in a tooltip.
- **Cone search** — enter a centre position (RA, Dec) and radius to restrict the visible area to that sky region.

Point sizes are proportional to detection significance (square-root scale).
Point colours indicate the primary catalog (yellow = Fermi-LAT, cyan = LHAASO, orange = HAWC, purple = TeVCat).

### Analysis Scope

Below the sky map, a control card lets you customise what is analysed:

- **Catalog toggles** — click FERMI, LHAASO, HAWC, or TEVCAT to include or exclude that catalog from all metrics and charts on the page.
- **Group by** — choose how to aggregate the statistics table:
  - *By Catalog* — one row per catalog
  - *By Source Class* — one row per object type
  - *By Discovery Method*
  - *By Confidence Band*
  - *By Catalog Count Band*

The **Groupings table** shows for each group: sample count, average flux, average significance, average confidence, average catalog count, and the percentage of sources appearing in more than one catalog.

### Headline Metrics

Five summary cards show aggregate statistics for the currently selected catalogs:

| Card | Meaning |
|------|---------|
| **Samples** | Total number of sources |
| **Avg Sigma** | Mean detection significance |
| **Avg Flux** | Mean integrated flux above 1 GeV |
| **Avg Confidence** | Mean cross-match confidence |
| **Multi-Catalog Share** | Percentage of sources found in more than one catalog |

### Charts

| Chart | What it shows |
|-------|--------------|
| **Catalog Comparison** | Bar chart of science score and multi-catalog share per catalog |
| **Catalog Coverage** | Bar chart of source count and class diversity per catalog |
| **Class Mix** | Stacked bar chart showing the distribution of source classes within each catalog; the top classes are shown individually, the remainder grouped as *Other* |
| **Significance Histogram** | Distribution of detection significance values across log-spaced bins, with one bar series per selected catalog, enabling direct cross-catalog comparison |

### Top Sources Table

At the bottom of the page a ranked table lists the highest-scoring sources across the selected catalogs, showing name, catalog, source class, significance, flux, confidence, catalog count, and composite detectability score.

---

## 6. Universe Map — 3D View

Navigate to **Universe Map** for an interactive 3D celestial sphere showing all sources as points on the sky.

### Controls

| Action | How |
|--------|-----|
| **Rotate** | Click and drag |
| **Zoom in / out** | Scroll wheel |
| **Click a cluster or point** | Opens the detail panel for that source or region |
| **Press Escape** | Exits a focused region and returns to the full-sky view |

At high zoom levels individual source points are shown. At lower zoom levels nearby sources are automatically merged into cluster markers displaying the source count for that region. Zoom in on a cluster to resolve it into individual points.

The status bar at the bottom-left shows the current counts: *Clusters / Points / Shown / Total*.

### Filters and Legend

The **legend** (top-left) shows the colour assigned to each catalog:

| Colour | Catalog |
|--------|---------|
| Yellow | Fermi-LAT |
| Cyan | LHAASO |
| Orange | HAWC |
| Purple | TeVCat |

The **filter panel** (top-right) contains a checkbox for each catalog. Uncheck a catalog to hide all its sources from the sphere.

### Source Detail Panel

Clicking an individual source point opens a panel on the right side of the screen showing:

- Source name, catalog badge, and coordinate pair (RA / Dec)
- Source class and catalog count
- Associated name, discovery method, and primary catalog
- Significance, Flux1000, and spectral index
- Best and average cross-match confidence

Close the panel with the × button or by clicking elsewhere on the sphere.

---

## 7. Data Reference

### Catalogs

| Short name | Full name | Format | Coverage |
|------------|-----------|--------|----------|
| **FERMI** | Fermi-LAT 4FGL-DR4 | FITS | Full sky, E > 100 MeV |
| **HAWC** | HAWC 3HWC | YAML | Northern sky, E > 1 TeV |
| **LHAASO** | LHAASO 1LHAASO DR1 | FITS | Northern sky, E > 1 TeV |
| **TEVCAT** | TeVCat | TAP/HEASARC | Known TeV sources, full sky |

### Source Classes

| Code | Object type |
|------|-------------|
| PSR | Pulsar |
| PWN | Pulsar Wind Nebula |
| SNR | Supernova Remnant |
| AGN | Active Galactic Nucleus (generic) |
| FSRQ | Flat-Spectrum Radio Quasar |
| BLL | BL Lacertae object |
| BCU | Blazar Candidate of Uncertain type |
| UNK | Unidentified / unassociated |

### Field Definitions

| Field | Unit | Description |
|-------|------|-------------|
| RA | degrees (0–360) | Right Ascension, J2000 ICRS |
| Dec | degrees (−90 to +90) | Declination, J2000 ICRS |
| Significance | — | Detection significance (σ) as reported in the source catalog |
| Flux1000 | ph cm⁻² s⁻¹ | Integrated photon flux above 1 GeV |
| Spectral Index | — | Power-law photon index Γ (dN/dE ∝ E^−Γ) |
| Confidence | 0–1 | Cross-match confidence: probability that the unified source correctly associates the catalog entries |
| Catalog Count | integer | Number of independent catalogs in which this source has an entry |
| Detectability Score | 0–100 | Composite score combining significance, flux, and cross-match confidence; ≥ 70 = high, 40–69 = medium, < 40 = low |

---

## 8. Language

The application is available in **English** and **Polish**. The active language is shown in the top-right corner of the navigation bar. Click the language indicator to switch. Your choice is remembered between sessions.
