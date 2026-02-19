import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import { AppLayout } from './components/AppLayout'
import DashboardPage from './pages/DashboardPage'
import WelcomePage from './pages/WelcomePage'
import MicrophonePage from './pages/MicrophonePage'
import CameraPage from './pages/CameraPage'
import ScreenPage from './pages/ScreenPage'
import BluetoothPage from './pages/BluetoothPage'
import NetworkPage from './pages/NetworkPage'
import CronPage from './pages/CronPage'
import LifecyclePage from './pages/LifecyclePage'
import WindowManagerPage from './pages/WindowManagerPage'
import FilesystemPage from './pages/FilesystemPage'
import DialogsPage from './pages/DialogsPage'
import NotificationsPage from './pages/NotificationsPage'
import ClipboardPage from './pages/ClipboardPage'
import UpdateSimulatorPage from './pages/UpdateSimulatorPage'
import SettingsPage from './pages/SettingsPage'
import RagPage from './pages/RagPage'
import NewPostPage from './pages/NewPostPage'
import NewWritingPage from './pages/NewWritingPage'
import NewNotePage from './pages/NewNotePage'
import NewMessagePage from './pages/NewMessagePage'
import WorkspaceSelectorPage from './pages/WorkspaceSelectorPage'
import './index.css'
import HomePage from './pages/HomePage'

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          {/* Welcome page - standalone, shown first */}
          <Route path="/" element={<WelcomePage />} />

          {/* Workspace selector - standalone without AppLayout */}
          {/* <Route path="/workspace-selector" element={<WorkspaceSelectorPage />} /> */}

          {/* All other routes use AppLayout */}
          <Route path="*" element={
            <AppLayout>
              <Routes>
                <Route path="/home" element={<HomePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/microphone" element={<MicrophonePage />} />
                <Route path="/camera" element={<CameraPage />} />
                <Route path="/screen" element={<ScreenPage />} />
                <Route path="/bluetooth" element={<BluetoothPage />} />
                <Route path="/network" element={<NetworkPage />} />
                <Route path="/cron" element={<CronPage />} />
                <Route path="/lifecycle" element={<LifecyclePage />} />
                <Route path="/windows" element={<WindowManagerPage />} />
                <Route path="/filesystem" element={<FilesystemPage />} />
                <Route path="/dialogs" element={<DialogsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/clipboard" element={<ClipboardPage />} />
                <Route path="/update-simulator" element={<UpdateSimulatorPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/rag" element={<RagPage />} />
                <Route path="/new/post" element={<NewPostPage />} />
                <Route path="/new/writing" element={<NewWritingPage />} />
                <Route path="/new/note" element={<NewNotePage />} />
                <Route path="/new/message" element={<NewMessagePage />} />
              </Routes>
            </AppLayout>
          } />
        </Routes>
      </Router>
    </Provider>
  )
}

export default App
