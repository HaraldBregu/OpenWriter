import React, { lazy, Suspense } from 'react'
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { AppProvider } from './contexts'
import { PersonalityTaskProvider } from '@/contexts/PersonalityTaskContext'
import { AppLayout } from './components/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import WelcomePage from './pages/WelcomePage'
import './index.css'

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NewPostPage = lazy(() => import('./pages/NewPostPage'))
const NewWritingPage = lazy(() => import('./pages/NewWritingPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const DirectoriesPage = lazy(() => import('./pages/DirectoriesPage'))
const EmotionalDepthPage = lazy(() => import('./pages/personality/EmotionalDepthPage'))
const ConsciousnessPage = lazy(() => import('./pages/personality/ConsciousnessPage'))
const MotivationPage = lazy(() => import('./pages/personality/MotivationPage'))
const MoralIntuitionPage = lazy(() => import('./pages/personality/MoralIntuitionPage'))
const IrrationalityPage = lazy(() => import('./pages/personality/IrrationalityPage'))
const GrowthPage = lazy(() => import('./pages/personality/GrowthPage'))
const SocialIdentityPage = lazy(() => import('./pages/personality/SocialIdentityPage'))
const CreativityPage = lazy(() => import('./pages/personality/CreativityPage'))
const MortalityPage = lazy(() => import('./pages/personality/MortalityPage'))
const ContradictionPage = lazy(() => import('./pages/personality/ContradictionPage'))
const DebugPage = lazy(() => import('./pages/DebugPage'))

function RouteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary level="route">
      <Suspense fallback={<LoadingSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

const App: React.FC = () => {
  return (
    <ErrorBoundary level="root">
      <Provider store={store}>
        <AppProvider>
          <PersonalityTaskProvider>
          <Router>
              <Routes>
                {/* Welcome page - standalone, shown first */}
                <Route path="/" element={<WelcomePage />} />

                {/* All other routes use AppLayout */}
                <Route path="*" element={
                  <AppLayout>
                    <Suspense fallback={<LoadingSkeleton />}>
                      <Routes>
                        <Route path="/home" element={<RouteWrapper><HomePage /></RouteWrapper>} />
                        <Route path="/dashboard" element={<RouteWrapper><DashboardPage /></RouteWrapper>} />
                        <Route path="/settings" element={<RouteWrapper><SettingsPage /></RouteWrapper>} />
                        <Route path="/pipeline-test" element={<Navigate to="/debug" replace />} />
                        <Route path="/new/post" element={<RouteWrapper><NewPostPage /></RouteWrapper>} />
                        <Route path="/new/post/:id" element={<RouteWrapper><NewPostPage /></RouteWrapper>} />
                        <Route path="/new/writing" element={<RouteWrapper><NewWritingPage /></RouteWrapper>} />
                        <Route path="/new/writing/:id" element={<RouteWrapper><NewWritingPage /></RouteWrapper>} />
                        <Route path="/documents" element={<RouteWrapper><DocumentsPage /></RouteWrapper>} />
                        <Route path="/directories" element={<RouteWrapper><DirectoriesPage /></RouteWrapper>} />
                        <Route path="/personality/emotional-depth" element={<RouteWrapper><EmotionalDepthPage /></RouteWrapper>} />
                        <Route path="/personality/consciousness" element={<RouteWrapper><ConsciousnessPage /></RouteWrapper>} />
                        <Route path="/personality/motivation" element={<RouteWrapper><MotivationPage /></RouteWrapper>} />
                        <Route path="/personality/moral-intuition" element={<RouteWrapper><MoralIntuitionPage /></RouteWrapper>} />
                        <Route path="/personality/irrationality" element={<RouteWrapper><IrrationalityPage /></RouteWrapper>} />
                        <Route path="/personality/growth" element={<RouteWrapper><GrowthPage /></RouteWrapper>} />
                        <Route path="/personality/social-identity" element={<RouteWrapper><SocialIdentityPage /></RouteWrapper>} />
                        <Route path="/personality/creativity" element={<RouteWrapper><CreativityPage /></RouteWrapper>} />
                        <Route path="/personality/mortality" element={<RouteWrapper><MortalityPage /></RouteWrapper>} />
                        <Route path="/personality/contradiction" element={<RouteWrapper><ContradictionPage /></RouteWrapper>} />
                        <Route path="/debug" element={<RouteWrapper><DebugPage /></RouteWrapper>} />
                        <Route path="/downloads-demo" element={<Navigate to="/debug" replace />} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                } />
              </Routes>
          </Router>
          </PersonalityTaskProvider>
        </AppProvider>
      </Provider>
    </ErrorBoundary>
  )
}

export default App
