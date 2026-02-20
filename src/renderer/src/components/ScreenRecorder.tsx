import {
  RecorderProvider,
  RecorderVisualizer,
  RecorderControls,
  RecorderPlayback,
  RecorderError
} from './recorder'

export function ScreenRecorder() {
  return (
    <RecorderProvider config={{ mediaType: 'screen' }}>
      <div className="space-y-6">
        <RecorderError />
        <RecorderVisualizer />
        <RecorderControls />
        <RecorderPlayback />
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Tip:</strong> You'll be prompted to choose which screen, window, or tab to share.
            The recording will include system audio if available.
          </p>
        </div>
      </div>
    </RecorderProvider>
  )
}
