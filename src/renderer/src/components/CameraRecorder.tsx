import {
  RecorderProvider,
  RecorderVisualizer,
  RecorderControls,
  RecorderPlayback,
  RecorderError
} from './recorder'

export function CameraRecorder() {
  return (
    <RecorderProvider config={{ mediaType: 'camera' }}>
      <div className="space-y-6">
        <RecorderError />
        <RecorderVisualizer />
        <RecorderControls />
        <RecorderPlayback />
      </div>
    </RecorderProvider>
  )
}
