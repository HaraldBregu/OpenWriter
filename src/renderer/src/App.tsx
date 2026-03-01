import React, { lazy, Suspense } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store";
import { AppProvider } from "./contexts";
import { AppLayout } from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import WelcomePage from "./pages/WelcomePage";
import "./index.css";

// Lazy-loaded pages
const HomePage = lazy(() => import("./pages/HomePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ContentPage = lazy(() => import("./pages/ContentPage"));
const DebugPage = lazy(() => import("./pages/DebugPage"));
function RouteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary level="route">
      <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

const App: React.FC = () => {
  return (
    <ErrorBoundary level="root">
      <Provider store={store}>
        <AppProvider>
          <Router>
            <Routes>
              {/* Welcome page - standalone, shown first */}
              <Route path="/" element={<WelcomePage />} />

              {/* All other routes use AppLayout */}
              <Route
                path="*"
                element={
                  <AppLayout>
                    <Suspense fallback={<LoadingSkeleton />}>
                      <Routes>
                        <Route
                          path="/home"
                          element={
                            <RouteWrapper>
                              <HomePage />
                            </RouteWrapper>
                          }
                        />
                        <Route
                          path="/settings"
                          element={
                            <RouteWrapper>
                              <SettingsPage />
                            </RouteWrapper>
                          }
                        />
                        <Route
                          path="/content/:id"
                          element={
                            <RouteWrapper>
                              <ContentPage />
                            </RouteWrapper>
                          }
                        />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                }
              />
            </Routes>
          </Router>
        </AppProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
