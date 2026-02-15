import { useRef, useEffect, useState } from 'react'
import { useMediaRecorder, formatRecordingTime } from '../hooks/useMediaRecorder'

/**
 * Screen recorder component with display capture
 */
export function ScreenRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackRef = useRef<HTMLVideoElement>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)

  const {
    isRecording,
    isPaused,
    recordingTime,
    recordedBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    downloadRecording
  } = useMediaRecorder()

  const handleStartPreview = async () => {
    clearRecording()
    setStreamError(null)
    screenStreamRef.current = null

    try {
      // @ts-ignore - getDisplayMedia is available
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          // @ts-ignore - cursor is valid for screen capture
          cursor: 'always',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      })

      screenStreamRef.current = screenStream
      setIsStreaming(true)

      if (videoRef.current) {
        videoRef.current.srcObject = screenStream
      }

      // Handle stream ending (user stops sharing)
      screenStream.getVideoTracks()[0].onended = () => {
        handleStop()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access screen'
      setStreamError(errorMessage)
      console.error('Error accessing screen:', err)
    }
  }

  const handleStartRecording = () => {
    if (screenStreamRef.current) {
      startRecording(screenStreamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' })
    }
  }

  const handleStop = () => {
    if (isRecording) {
      stopRecording()
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
      screenStreamRef.current = null
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    setIsStreaming(false)
  }

  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadRecording(`screen-${timestamp}.webm`)
  }

  useEffect(() => {
    if (recordedBlob && playbackRef.current) {
      const url = URL.createObjectURL(recordedBlob)
      playbackRef.current.src = url
      return () => URL.revokeObjectURL(url)
    }
    return undefined
  }, [recordedBlob])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const error = streamError || recordingError

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {isStreaming ? '🖥️ Live Screen' : '🖥️ Screen'}
          </h2>
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-lg font-semibold text-red-600">
                {formatRecordingTime(recordingTime)}
              </span>
              {isPaused && <span className="text-sm text-gray-500">(Paused)</span>}
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video">
          {isStreaming ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">🖥️</div>
                <p>Click "Start Preview" to select screen</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!isStreaming && !isRecording && (
            <button
              onClick={handleStartPreview}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
            >
              Start Preview
            </button>
          )}

          {isStreaming && !isRecording && (
            <>
              <button
                onClick={handleStartRecording}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                ⏺ Start Recording
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
                  ⏸ Pause
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
                >
                  ▶ Resume
                </button>
              )}
              <button
                onClick={handleStop}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                ⏹ Stop Recording
              </button>
            </>
          )}
        </div>

        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Tip:</strong> You'll be prompted to choose which screen, window, or tab to share.
            The recording will include system audio if available.
          </p>
        </div>
      </div>

      {recordedBlob && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recorded Screen</h2>
          <video ref={playbackRef} controls className="w-full rounded-lg bg-gray-900" />
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleDownload}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
            >
              💾 Download
            </button>
            <button
              onClick={clearRecording}
              className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
            >
              🗑️ Clear
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Size: {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB</p>
            <p>Type: {recordedBlob.type}</p>
            <p>Duration: {formatRecordingTime(recordingTime)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
