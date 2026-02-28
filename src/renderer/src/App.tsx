import React, { lazy, Suspense } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { AppProvider } from './contexts'
import { TaskProvider } from '@/contexts/TaskContext'
import { EnhancementProvider } from '@/contexts/EnhancementContext'
import { PersonalityTaskProvider } from '@/contexts/PersonalityTaskContext'
import { electronPersonalityTaskService } from '@/services/ElectronPersonalityTaskService'
import { AppLayout } from './components/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import WelcomePage from './pages/WelcomePage'
import './index.css'

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ContentPage = lazy(() => import('./pages/ContentPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const DirectoriesPage = lazy(() => import('./pages/DirectoriesPage'))
const EmotionalDepthPage = lazy(() => import('./pages/personality/EmotionalDepthPage'))
const ConsciousnessPage = lazy(() => import('./pages/personality/ConsciousnessPage'))
const MotivationPage = lazy(() => import('./pages/personality/MotivationPage'))
const SocialIdentityPage = lazy(() => import('./pages/personality/SocialIdentityPage'))
const CreativityPage = lazy(() => import('./pages/personality/CreativityPage'))
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
          <TaskProvider>
          <PersonalityTaskProvider service={electronPersonalityTaskService}>
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
                        <Route path="/settings" element={<RouteWrapper><SettingsPage /></RouteWrapper>} />
                        <Route path="/content/:id" element={<RouteWrapper><ContentPage /></RouteWrapper>} />
                        <Route path="/documents" element={<RouteWrapper><DocumentsPage /></RouteWrapper>} />
                        <Route path="/directories" element={<RouteWrapper><DirectoriesPage /></RouteWrapper>} />
                        <Route path="/personality/emotional-depth" element={<RouteWrapper><EmotionalDepthPage /></RouteWrapper>} />
                        <Route path="/personality/consciousness" element={<RouteWrapper><ConsciousnessPage /></RouteWrapper>} />
                        <Route path="/personality/motivation" element={<RouteWrapper><MotivationPage /></RouteWrapper>} />
                        <Route path="/personality/social-identity" element={<RouteWrapper><SocialIdentityPage /></RouteWrapper>} />
                        <Route path="/personality/creativity" element={<RouteWrapper><CreativityPage /></RouteWrapper>} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                } />
              </Routes>
          </Router>
          </PersonalityTaskProvider>
          </TaskProvider>
        </AppProvider>
      </Provider>
    </ErrorBoundary>
  )
}

export default App
