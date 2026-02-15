import React from 'react'
import { ScreenRecorder } from '../components/ScreenRecorder'

const ScreenPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🖥️ Screen</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Record your screen, window, or tab with audio
        </p>
      </div>

      <ScreenRecorder />
    </div>
  )
}

export default ScreenPage
