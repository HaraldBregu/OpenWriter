import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import WelcomePage from './pages/WelcomePage'
import MicrophonePage from './pages/MicrophonePage'
import CameraPage from './pages/CameraPage'
import ScreenPage from './pages/ScreenPage'
import BluetoothPage from './pages/BluetoothPage'
import NetworkPage from './pages/NetworkPage'
import CronPage from './pages/CronPage'
import SettingsPage from './pages/SettingsPage'
import './index.css'

const App: React.FC = () => {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/microphone" element={<MicrophonePage />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/screen" element={<ScreenPage />} />
          <Route path="/bluetooth" element={<BluetoothPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/cron" element={<CronPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppLayout>
    </Router>
  )
}

export default App
