import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomePage, UniverseMapPage } from "./pages";
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/universe-map" element={<UniverseMapPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/sources/:id" element={<SourceDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
