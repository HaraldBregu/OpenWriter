import React, { createContext, useContext, useRef, useEffect, useState, useCallback } from 'react'
import { useMediaStream } from '../../hooks/useMediaStream'
import { useMediaRecorder, formatRecordingTime } from '../../hooks/useMediaRecorder'

export type MediaType = 'microphone' | 'camera' | 'screen'

interface RecorderConfig {
  mediaType: MediaType
  audioVisualization?: boolean
}

interface RecorderContextValue {
  config: RecorderConfig

  // Stream state
  stream: MediaStream | null
  isStreaming: boolean
  streamError: string | null

  // Recording state
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  recordedBlob: Blob | null
  recordingError: string | null

  // Refs for media elements
  videoRef: React.RefObject<HTMLVideoElement | null>
  playbackRef: React.RefObject<HTMLVideoElement | HTMLAudioElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>

  // Actions
  handleStartPreview: () => Promise<void>
  handleStartRecording: () => void
  handleStop: () => void
  handleDownload: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  clearRecording: () => void
  formatTime: (seconds: number) => string

  // Computed
  error: string | null
  hasActiveStream: boolean
  isAudioOnly: boolean
}

const RecorderContext = createContext<RecorderContextValue | null>(null)

export function useRecorderController(): RecorderContextValue {
  const ctx = useContext(RecorderContext)
  if (!ctx) throw new Error('useRecorderController must be used within RecorderProvider')
  return ctx
}

interface RecorderProviderProps {
  config: RecorderConfig
  children: React.ReactNode
}

export function RecorderProvider({ config, children }: RecorderProviderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playbackRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  const [screenStreaming, setScreenStreaming] = useState(false)
  const [screenError, setScreenError] = useState<string | null>(null)

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
    clearRecording: clearRec,
    downloadRecording
  } = useMediaRecorder()

  const isAudioOnly = config.mediaType === 'microphone'
  const isScreen = config.mediaType === 'screen'

  // handleStop is defined before handleStartPreview so that the onended callback
  // always calls the most current version. We keep the ref pattern so that
  // handleStartPreview doesn't need to list handleStop as a dependency (which
  // would cause circular dependency issues with useCallback).
  const handleStop = useCallback(() => {
    if (isRecording) stopRecording()
    stopStream()

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop())
      screenStreamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
    }
    setScreenStreaming(false)
  }, [isRecording, stopRecording, stopStream])

  // Stable ref so the onended callback inside handleStartPreview always calls
  // the latest version of handleStop without needing it in the dep array.
  const handleStopRef = useRef(handleStop)
  handleStopRef.current = handleStop

  const handleStartPreview = useCallback(async () => {
    clearRec()

    if (config.mediaType === 'microphone') {
      await startStream({ audio: true, video: false })
    } else if (config.mediaType === 'camera') {
      await startStream({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      })
    } else {
      // Screen
      setScreenError(null)
      screenStreamRef.current = null
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
        screenStreamRef.current = screenStream
        setScreenStreaming(true)
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream
        }
        screenStream.getVideoTracks()[0].onended = () => {
          handleStopRef.current()
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to access screen'
        setScreenError(errorMessage)
        console.error('Error accessing screen:', err)
      }
    }
  }, [config.mediaType, clearRec, startStream])

  const handleStartRecording = useCallback(() => {
    const activeStream = isScreen ? screenStreamRef.current : stream
    if (activeStream) {
      const mimeType = isAudioOnly
        ? 'audio/webm;codecs=opus'
        : 'video/webm;codecs=vp9,opus'
      startRecording(activeStream, { mimeType })
    }
  }, [isScreen, isAudioOnly, stream, startRecording])

  const handleDownload = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadRecording(`${config.mediaType}-${timestamp}.webm`)
  }, [config.mediaType, downloadRecording])

  // Video preview for camera/screen
  useEffect(() => {
    if (stream && videoRef.current && !isAudioOnly) {
      videoRef.current.srcObject = stream
    }
  }, [stream, isAudioOnly])

  // Audio visualization
  useEffect(() => {
    if (!stream || !config.audioVisualization || !canvasRef.current) return

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    analyser.fftSize = 256
    source.connect(analyser)
    audioContextRef.current = audioContext
    analyserRef.current = analyser

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
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
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }
    draw()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      audioContext.close()
    }
  }, [stream, config.audioVisualization])

  // Playback URL
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
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const hasActiveStream = isStreaming || screenStreaming
  const error = streamError || recordingError || screenError

  const value: RecorderContextValue = {
    config,
    stream,
    isStreaming: hasActiveStream,
    streamError,
    isRecording,
    isPaused,
    recordingTime,
    recordedBlob,
    recordingError,
    videoRef,
    playbackRef,
    canvasRef,
    handleStartPreview,
    handleStartRecording,
    handleStop,
    handleDownload,
    pauseRecording,
    resumeRecording,
    clearRecording: clearRec,
    formatTime: formatRecordingTime,
    error,
    hasActiveStream,
    isAudioOnly
  }

  return <RecorderContext.Provider value={value}>{children}</RecorderContext.Provider>
}
