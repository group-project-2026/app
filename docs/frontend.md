# Frontend

React single-page application for browsing, filtering, and visualizing the astronomy catalog data.

---

## Tech Stack

| Component | Version |
|-----------|---------|
| React | ^19.2.4 |
| React DOM | ^19.2.4 |
| TypeScript | ~5.9.3 |
| Vite | ^8.0.1 |
| React Router | ^7.13.2 |
| TanStack React Query | ^5.95.2 |
| Tailwind CSS | ^4.2.2 |
| Three.js | ^0.183.2 |
| React Three Fiber | ^9.5.0 |
| D3 | ^7.9.0 |
| i18next | ^26.0.3 |
| Jest | ^30.3.0 |

---

## Project Layout

```
frontend/src/
├── __mocks__/                  # Static asset mocks for Jest
├── components/
│   ├── ui/                     # shadcn/radix-ui primitives (Button, Card, Badge, etc.)
│   ├── universe-map/           # 3D celestial sphere (11 files: scene, clustering, filters, legend)
│   ├── DataTable.tsx           # Generic sortable data table
│   ├── DataTablePagination.tsx # Pagination controls
│   ├── DataTableFilters.tsx    # Filter UI (sliders, multiselect, text search)
│   ├── NavigationHeader.tsx    # Top navigation bar
│   ├── LanguageSwitcher.tsx    # EN / PL toggle
│   └── CosmicParticles.tsx     # Animated background particle canvas
├── features/
│   ├── sources/                # Source list & detail feature (7 files)
│   └── source-analytics/       # Analytics dashboard feature (5 files)
├── pages/
│   ├── HomePage.tsx
│   ├── UniverseMapPage.tsx
│   ├── CatalogAnalyticsPage.tsx  # Re-exports from features/source-analytics
│   └── SourceDetailPage.tsx
├── locales/
│   ├── en.json                 # English translations
│   └── pl.json                 # Polish translations
├── lib/
│   └── utils.ts                # Utility helpers (clsx/tw-merge wrapper)
├── types/                      # TypeScript interfaces for API responses
├── i18n.ts                     # i18next configuration
├── App.tsx                     # Router tree and QueryClient provider
├── main.tsx                    # React DOM entry point
└── setupTests.ts               # Jest / Testing Library global setup
```

---

## Routing

Router: **React Router v7** (`BrowserRouter`). All routes share the `AppLayout` wrapper (renders `NavigationHeader` + `<Outlet>`).

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `HomePage` | Landing page: hero, feature cards, quick stats |
| `/universe-map` | `UniverseMapPage` | Interactive 3D celestial sphere |
| `/source-analytics` | `CatalogAnalyticsPage` | Statistical analysis dashboard |
| `/sources` | `SourcesPage` | Paginated data table with filters |
| `/sources/:id` | `SourceDetailPage` | Individual source details + catalog entries |
| `*` | Redirect to `/` | Catch-all |

---

## State Management

No global state library (no Redux, Zustand, or Context stores).

All async data is managed with **TanStack React Query v5** (`useQuery`). Query stale time is set to 5 minutes for most hooks.

### Custom Query Hooks

| Hook | File | Query |
|------|------|-------|
| `useSourcesData(params)` | `features/sources/useSourcesData.ts` | Paginated sources list with filters |
| `useSourceDetail(id)` | `features/sources/useSourceDetail.ts` | Single source by ID |
| `useSourceCatalogEntries(id)` | `features/sources/useSourceCatalogEntries.ts` | Catalog entries for a source |
| `useUniverseMapPoints()` | `components/universe-map/` (inlined) | All map points (up to 100 pages × 200 items) |

Local UI state (pagination offsets, selected filters) is managed with `useState` inside each component.

---

## API Integration

### Base URL

Defined in each API module:

```ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
```

In development the Vite dev server proxies `/api` to the backend (see [Vite proxy config](#vite-config)).

### API Modules

| File | Functions | Endpoints called |
|------|-----------|-----------------|
| `features/sources/api.ts` | `fetchSources(params)`, `fetchSourceDetail(id)`, `fetchCatalogEntriesBySource(id)` | `GET /api/sources/filter/`, `GET /api/sources/{id}/`, `GET /api/catalog-entries/?source=` |
| `features/source-analytics/api.ts` | `fetchSourceAnalyticsMap(filters)` | `GET /api/sources/analytics_map/` |
| `components/universe-map/api.ts` | `fetchUniverseMapPoints()` | `GET /api/sources/?page=&page_size=200` (paginates through all pages up to 100) |

No authentication headers are set — the API is publicly accessible.

Response envelope for paginated endpoints:

```ts
{
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
```

### Vite Config

`frontend/vite.config.ts` — proxies all `/api` requests during development:

```ts
server: {
  proxy: {
    "/api": {
      target: process.env.VITE_PROXY_TARGET?.trim() || "http://backend:8000",
      changeOrigin: true,
    },
  },
},
```

Path alias: `@` → `./src`.

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `/api` | API base URL used in all API modules |
| `VITE_PROXY_TARGET` | `http://backend:8000` | Dev-server proxy target for `/api` requests |

Variables must be prefixed with `VITE_` to be exposed to browser code by Vite. They are supplied via the root `.env` file when running under Docker Compose.

---

## Internationalization

Supported languages: **English** (`en`) and **Polish** (`pl`). Configured in `src/i18n.ts` using i18next with language persisted in `localStorage` and English as the fallback.

Translation files: `src/locales/en.json` and `src/locales/pl.json`. Used throughout with the `useTranslation()` hook and the `<LanguageSwitcher>` component.

---

## Running Locally

```bash
cd frontend

# Install dependencies
npm ci

# Start the development server (available at http://localhost:3000)
npm run dev
```

The Vite dev server listens on port 5173 by default; the Docker entrypoint overrides it to port 3000:

```bash
npm run dev -- --host --port 3000
```

**Required environment variables** — create a `.env` file in the frontend directory (or the repo root when using Docker Compose):

```env
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8000
```

---

## Build

```bash
npm run build
```

Runs `tsc -b && vite build`. Output is written to `frontend/dist/`.

To preview the production build locally:

```bash
npm run preview
```

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# CI mode (no watch, serial execution)
npm run test:ci
```

Framework: **Jest v30** with `jest-environment-jsdom` and **Testing Library** (`@testing-library/react`). Configuration is in `frontend/jest.config.cjs`. Global setup in `src/setupTests.ts`.
