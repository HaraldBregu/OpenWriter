import {
  RecorderProvider,
  RecorderVisualizer,
  RecorderControls,
  RecorderPlayback,
  RecorderError
} from './recorder'

export function MicrophoneRecorder() {
  return (
    <RecorderProvider config={{ mediaType: 'microphone', audioVisualization: true }}>
      <div className="space-y-6">
        <RecorderError />
        <RecorderVisualizer />
        <RecorderControls />
        <RecorderPlayback />
      </div>
    </RecorderProvider>
  )
}
