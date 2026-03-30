import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogAnalyticsPage, HomePage, UniverseMapPage } from "./pages";
import { NavigationHeader } from "./components/NavigationHeader";
import { SourcesPage } from "./features/sources/SourcesPage";
import { SourceDetailPage } from "./features/sources/SourceDetailPage";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function AppLayout() {
  return (
    <div className="min-h-screen text-white bg-slate-950 px-4">
      <NavigationHeader />
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="universe-map" element={<UniverseMapPage />} />
            <Route path="source-analytics" element={<CatalogAnalyticsPage />} />
            <Route path="sources" element={<SourcesPage />} />
            <Route path="sources/:id" element={<SourceDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
