import React, { lazy, Suspense } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { AppProvider } from './contexts'
import { AppLayout } from './components/AppLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import WelcomePage from './pages/WelcomePage'
import './index.css'

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const MicrophonePage = lazy(() => import('./pages/MicrophonePage'))
const CameraPage = lazy(() => import('./pages/CameraPage'))
const ScreenPage = lazy(() => import('./pages/ScreenPage'))
const BluetoothPage = lazy(() => import('./pages/BluetoothPage'))
const NetworkPage = lazy(() => import('./pages/NetworkPage'))
const CronPage = lazy(() => import('./pages/CronPage'))
const LifecyclePage = lazy(() => import('./pages/LifecyclePage'))
const WindowManagerPage = lazy(() => import('./pages/WindowManagerPage'))
const FilesystemPage = lazy(() => import('./pages/FilesystemPage'))
const DialogsPage = lazy(() => import('./pages/DialogsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const ClipboardPage = lazy(() => import('./pages/ClipboardPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NewPostPage = lazy(() => import('./pages/NewPostPage'))
const NewWritingPage = lazy(() => import('./pages/NewWritingPage'))
const NewNotePage = lazy(() => import('./pages/NewNotePage'))
const NewMessagePage = lazy(() => import('./pages/NewMessagePage'))
const PipelineTestPage = lazy(() => import('./pages/PipelineTestPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const DirectoriesPage = lazy(() => import('./pages/DirectoriesPage'))
const PrinciplesPage = lazy(() => import('./pages/personality/PrinciplesPage'))
const ConsciousnessPage = lazy(() => import('./pages/personality/ConsciousnessPage'))
const MemoryPage = lazy(() => import('./pages/personality/MemoryPage'))
const ReasoningPage = lazy(() => import('./pages/personality/ReasoningPage'))
const PerceptionPage = lazy(() => import('./pages/personality/PerceptionPage'))
const DebugPage = lazy(() => import('./pages/DebugPage'))
const DownloadsDemoPage = lazy(() => import('./pages/DownloadsDemo').then(m => ({ default: m.DownloadsDemo })))

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
                        <Route path="/microphone" element={<RouteWrapper><MicrophonePage /></RouteWrapper>} />
                        <Route path="/camera" element={<RouteWrapper><CameraPage /></RouteWrapper>} />
                        <Route path="/screen" element={<RouteWrapper><ScreenPage /></RouteWrapper>} />
                        <Route path="/bluetooth" element={<RouteWrapper><BluetoothPage /></RouteWrapper>} />
                        <Route path="/network" element={<RouteWrapper><NetworkPage /></RouteWrapper>} />
                        <Route path="/cron" element={<RouteWrapper><CronPage /></RouteWrapper>} />
                        <Route path="/lifecycle" element={<RouteWrapper><LifecyclePage /></RouteWrapper>} />
                        <Route path="/windows" element={<RouteWrapper><WindowManagerPage /></RouteWrapper>} />
                        <Route path="/filesystem" element={<RouteWrapper><FilesystemPage /></RouteWrapper>} />
                        <Route path="/dialogs" element={<RouteWrapper><DialogsPage /></RouteWrapper>} />
                        <Route path="/notifications" element={<RouteWrapper><NotificationsPage /></RouteWrapper>} />
                        <Route path="/clipboard" element={<RouteWrapper><ClipboardPage /></RouteWrapper>} />
                        <Route path="/settings" element={<RouteWrapper><SettingsPage /></RouteWrapper>} />
                        <Route path="/pipeline-test" element={<RouteWrapper><PipelineTestPage /></RouteWrapper>} />
                        <Route path="/new/post/:id" element={<RouteWrapper><NewPostPage /></RouteWrapper>} />
                        <Route path="/new/writing" element={<RouteWrapper><NewWritingPage /></RouteWrapper>} />
                        <Route path="/new/note" element={<RouteWrapper><NewNotePage /></RouteWrapper>} />
                        <Route path="/new/message" element={<RouteWrapper><NewMessagePage /></RouteWrapper>} />
                        <Route path="/documents" element={<RouteWrapper><DocumentsPage /></RouteWrapper>} />
                        <Route path="/directories" element={<RouteWrapper><DirectoriesPage /></RouteWrapper>} />
                        <Route path="/personality/principles" element={<RouteWrapper><PrinciplesPage /></RouteWrapper>} />
                        <Route path="/personality/consciousness" element={<RouteWrapper><ConsciousnessPage /></RouteWrapper>} />
                        <Route path="/personality/memory" element={<RouteWrapper><MemoryPage /></RouteWrapper>} />
                        <Route path="/personality/reasoning" element={<RouteWrapper><ReasoningPage /></RouteWrapper>} />
                        <Route path="/personality/perception" element={<RouteWrapper><PerceptionPage /></RouteWrapper>} />
                        <Route path="/debug" element={<RouteWrapper><DebugPage /></RouteWrapper>} />
                        <Route path="/downloads-demo" element={<RouteWrapper><DownloadsDemoPage /></RouteWrapper>} />
                      </Routes>
                    </Suspense>
                  </AppLayout>
                } />
              </Routes>
          </Router>
        </AppProvider>
      </Provider>
    </ErrorBoundary>
  )
}

export default App
