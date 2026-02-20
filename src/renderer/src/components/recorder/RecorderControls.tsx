import { useRecorderController } from './RecorderProvider'

export function RecorderControls() {
  const {
    hasActiveStream,
    isRecording,
    isPaused,
    handleStartPreview,
    handleStartRecording,
    handleStop,
    pauseRecording,
    resumeRecording
  } = useRecorderController()

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {!hasActiveStream && !isRecording && (
        <button
          onClick={handleStartPreview}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
        >
          Start Preview
        </button>
      )}

      {hasActiveStream && !isRecording && (
        <>
          <button
            onClick={handleStartRecording}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
          >
            Start Recording
          </button>
          <button
            onClick={handleStop}
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
          >
            Stop Preview
          </button>
        </>
      )}

      {isRecording && (
        <>
          {!isPaused ? (
            <button
              onClick={pauseRecording}
              className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={resumeRecording}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
            >
              Resume
            </button>
          )}
          <button
            onClick={handleStop}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Stop Recording
          </button>
        </>
      )}
    </div>
  )
}
