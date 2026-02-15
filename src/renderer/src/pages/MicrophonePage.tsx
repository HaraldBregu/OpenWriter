import React from 'react'
import { MicrophoneRecorder } from '../components/MicrophoneRecorder'
import { useMediaPermissions } from '../hooks/useMediaPermissions'

const MicrophonePage: React.FC = () => {
  const { microphoneStatus, requestMicrophone } = useMediaPermissions()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🎤 Microphone</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Record audio from your microphone with live waveform visualization
        </p>
      </div>

      {/* Permission Status */}
      {microphoneStatus !== 'granted' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                Microphone Permission Required
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Status: <span className="font-mono">{microphoneStatus}</span>
              </p>
            </div>
            <button
              onClick={requestMicrophone}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
            >
              Grant Permission
            </button>
          </div>
        </div>
      )}

      <MicrophoneRecorder />
    </div>
  )
}

export default MicrophonePage
