import { useState } from 'react'
import {
  RecorderProvider,
  RecorderVisualizer,
  RecorderControls,
  RecorderPlayback,
  RecorderError
} from './recorder'
import type { MediaType } from './recorder'

type RecordingMode = 'audio' | 'video' | 'screen'

const modeToMediaType: Record<RecordingMode, MediaType> = {
  audio: 'microphone',
  video: 'camera',
  screen: 'screen'
}

export function MediaRecorder() {
  const [mode, setMode] = useState<RecordingMode>('video')

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recording Mode</h2>
        <div className="flex space-x-2">
          {(['audio', 'video', 'screen'] as RecordingMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                mode === m
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {m === 'audio' ? 'Audio Only' : m === 'video' ? 'Video' : 'Screen'}
            </button>
          ))}
        </div>
      </div>

      <RecorderProvider
        key={mode}
        config={{
          mediaType: modeToMediaType[mode],
          audioVisualization: mode === 'audio'
        }}
      >
        <RecorderError />
        <RecorderVisualizer />
        <RecorderControls />
        <RecorderPlayback />
      </RecorderProvider>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Instructions:</strong>
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>Select a recording mode (Audio, Video, or Screen)</li>
          <li>Click &quot;Start Preview&quot; to see/hear your input</li>
          <li>Click &quot;Start Recording&quot; when ready</li>
          <li>Use Pause/Resume controls during recording</li>
          <li>Click &quot;Stop Recording&quot; when finished</li>
          <li>Review and download your recording</li>
        </ul>
      </div>
    </div>
  )
}
