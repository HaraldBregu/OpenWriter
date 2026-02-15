import { useRef, useEffect } from 'react'
import { useMediaStream } from '../hooks/useMediaStream'
import { useMediaRecorder, formatRecordingTime } from '../hooks/useMediaRecorder'

/**
 * Microphone-only recorder component
 */
export function MicrophoneRecorder() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const playbackRef = useRef<HTMLAudioElement>(null)

  const { stream, isStreaming, error: streamError, startStream, stopStream } = useMediaStream()

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
    await startStream({ audio: true, video: false })
  }

  const handleStartRecording = () => {
    if (stream) {
      startRecording(stream, { mimeType: 'audio/webm;codecs=opus' })
    }
  }

  const handleStop = () => {
    if (isRecording) {
      stopRecording()
    }
    stopStream()
  }

  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadRecording(`microphone-${timestamp}.webm`)
  }

  // Setup audio visualization
  useEffect(() => {
    if (stream && canvasRef.current) {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      visualizeAudio()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stream])

  const visualizeAudio = (): void => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const analyser = analyserRef.current

    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = (): void => {
      animationRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)

      ctx.fillStyle = 'rgb(30, 30, 30)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgb(59, 130, 246)'
      ctx.beginPath()

      const sliceWidth = (canvas.width * 1.0) / bufferLength
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }

        x += sliceWidth
      }

      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }

    draw()
  }

  useEffect(() => {
    if (recordedBlob && playbackRef.current) {
      const url = URL.createObjectURL(recordedBlob)
      playbackRef.current.src = url
      return () => URL.revokeObjectURL(url)
    }
    return undefined
  }, [recordedBlob])

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
            {isStreaming ? '🎤 Live Audio' : '🎤 Microphone'}
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

        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} width={800} height={200} className="w-full" />
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
      </div>

      {recordedBlob && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recorded Audio</h2>
          <audio ref={playbackRef} controls className="w-full" />
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
