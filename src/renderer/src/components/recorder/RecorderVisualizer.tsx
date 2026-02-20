import { useRecorderController } from './RecorderProvider'

export function RecorderVisualizer() {
  const { config, hasActiveStream, isRecording, isPaused, recordingTime, formatTime, videoRef, canvasRef, isAudioOnly } =
    useRecorderController()

  const emoji = config.mediaType === 'camera' ? '📹' : config.mediaType === 'screen' ? '🖥️' : '🎤'
  const label = config.mediaType === 'camera' ? 'Camera' : config.mediaType === 'screen' ? 'Screen' : 'Microphone'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {hasActiveStream ? `${emoji} Live ${isAudioOnly ? 'Audio' : 'Preview'}` : `${emoji} ${label}`}
        </h2>
        {isRecording && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-mono text-lg font-semibold text-red-600">
              {formatTime(recordingTime)}
            </span>
            {isPaused && <span className="text-sm text-gray-500">(Paused)</span>}
          </div>
        )}
      </div>

      {isAudioOnly ? (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} width={800} height={200} className="w-full" />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video">
          {hasActiveStream ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">{emoji}</div>
                <p>Click &quot;Start Preview&quot; to begin</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
