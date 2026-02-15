import { useRef, useEffect, useState } from 'react'
import { useMediaStream } from '../hooks/useMediaStream'
import { useMediaRecorder, formatRecordingTime } from '../hooks/useMediaRecorder'

type RecordingMode = 'audio' | 'video' | 'screen'

/**
 * Media recorder component with live preview and recording controls
 * Supports audio-only, video, and screen recording
 */
export function MediaRecorder() {
  const [mode, setMode] = useState<RecordingMode>('video')
  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

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

  /**
   * Handle starting preview based on selected mode
   */
  const handleStartPreview = async () => {
    clearRecording()
    screenStreamRef.current = null

    if (mode === 'audio') {
      await startStream({ audio: true, video: false })
    } else if (mode === 'video') {
      await startStream({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
    } else if (mode === 'screen') {
      try {
        // @ts-ignore - getDisplayMedia is available in Electron
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // @ts-ignore - cursor is valid for screen capture
            cursor: 'always',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: true
        })

        // Store screen stream in ref for recording
        screenStreamRef.current = screenStream

        if (videoRef.current) {
          videoRef.current.srcObject = screenStream
        }
      } catch (err) {
        console.error('Error accessing screen:', err)
      }
    }
  }

  /**
   * Handle starting recording
   */
  const handleStartRecording = () => {
    // Use screen stream for screen mode, otherwise use regular stream
    const activeStream = mode === 'screen' ? screenStreamRef.current : stream

    if (activeStream) {
      const mimeType = mode === 'audio'
        ? 'audio/webm;codecs=opus'
        : 'video/webm;codecs=vp9,opus'

      startRecording(activeStream, { mimeType })
    }
  }

  /**
   * Handle stopping both recording and preview
   */
  const handleStop = () => {
    if (isRecording) {
      stopRecording()
    }

    // Stop regular stream
    stopStream()

    // Stop screen stream if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
      screenStreamRef.current = null
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  /**
   * Handle download
   */
  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const extension = mode === 'audio' ? 'webm' : 'webm'
    const filename = `recording-${mode}-${timestamp}.${extension}`
    downloadRecording(filename)
  }

  /**
   * Setup video preview when stream is available
   */
  useEffect(() => {
    if (stream && videoRef.current && mode !== 'audio') {
      videoRef.current.srcObject = stream
    }
  }, [stream, mode])

  /**
   * Setup audio visualization for audio mode
   */
  useEffect(() => {
    if (stream && mode === 'audio' && canvasRef.current) {
      // Create audio context and analyser
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // Start visualization
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
  }, [stream, mode])

  /**
   * Visualize audio waveform on canvas
   */
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
      ctx.strokeStyle = 'rgb(59, 130, 246)' // Blue color
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

  /**
   * Setup playback when recording is complete
   */
  useEffect(() => {
    if (recordedBlob && playbackRef.current) {
      const url = URL.createObjectURL(recordedBlob)
      playbackRef.current.src = url

      return () => {
        URL.revokeObjectURL(url)
      }
    }
    return undefined
  }, [recordedBlob])

  const error = streamError || recordingError

  // Check if any stream is active (regular or screen)
  const hasActiveStream = isStreaming || screenStreamRef.current !== null

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recording Mode</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('audio')}
            disabled={hasActiveStream || isRecording}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'audio'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            🎤 Audio Only
          </button>
          <button
            onClick={() => setMode('video')}
            disabled={hasActiveStream || isRecording}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'video'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            📹 Video
          </button>
          <button
            onClick={() => setMode('screen')}
            disabled={hasActiveStream || isRecording}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'screen'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            🖥️ Screen
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Error:</p>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Preview Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {hasActiveStream ? 'Live Preview' : 'Preview'}
          </h2>
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-mono text-lg font-semibold text-red-600">
                {formatRecordingTime(recordingTime)}
              </span>
              {isPaused && (
                <span className="text-sm text-gray-500">(Paused)</span>
              )}
            </div>
          )}
        </div>

        {/* Video/Screen Preview */}
        {mode !== 'audio' && (
          <div className="bg-gray-900 rounded-lg overflow-hidden aspect-video">
            {hasActiveStream ? (
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
                  <div className="text-6xl mb-4">
                    {mode === 'video' ? '📹' : '🖥️'}
                  </div>
                  <p>Click "Start Preview" to begin</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audio Visualization */}
        {mode === 'audio' && (
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              className="w-full"
            />
          </div>
        )}

        {/* Controls */}
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

      {/* Playback Section */}
      {recordedBlob && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Recorded Media</h2>

          {mode === 'audio' ? (
            <audio
              ref={playbackRef}
              controls
              className="w-full"
            />
          ) : (
            <video
              ref={playbackRef}
              controls
              className="w-full rounded-lg bg-gray-900"
            />
          )}

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

          <div className="mt-4 text-sm text-gray-600">
            <p>Size: {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB</p>
            <p>Type: {recordedBlob.type}</p>
            <p>Duration: {formatRecordingTime(recordingTime)}</p>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Instructions:</strong>
        </p>
        <ul className="text-sm text-blue-800 list-disc list-inside mt-2 space-y-1">
          <li>Select a recording mode (Audio, Video, or Screen)</li>
          <li>Click "Start Preview" to see/hear your input</li>
          <li>Click "Start Recording" when ready</li>
          <li>Use Pause/Resume controls during recording</li>
          <li>Click "Stop Recording" when finished</li>
          <li>Review and download your recording</li>
        </ul>
      </div>
    </div>
  )
}
