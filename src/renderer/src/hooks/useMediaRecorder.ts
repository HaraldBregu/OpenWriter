import { useState, useRef, useCallback } from 'react'

interface UseMediaRecorderOptions {
  mimeType?: string
  audioBitsPerSecond?: number
  videoBitsPerSecond?: number
}

interface UseMediaRecorderReturn {
  isRecording: boolean
  isPaused: boolean
  recordingTime: number
  recordedChunks: Blob[]
  recordedBlob: Blob | null
  error: string | null
  startRecording: (stream: MediaStream, options?: UseMediaRecorderOptions) => void
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  clearRecording: () => void
  downloadRecording: (filename: string) => void
}

/**
 * React hook for recording media streams (audio/video)
 * Handles MediaRecorder API and provides recording controls
 */
export function useMediaRecorder(): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)

  /**
   * Start recording from a media stream
   */
  const startRecording = useCallback(
    (stream: MediaStream, options?: UseMediaRecorderOptions) => {
      try {
        setError(null)
        setRecordedChunks([])
        setRecordedBlob(null)
        setRecordingTime(0)
        pausedTimeRef.current = 0

        // Determine MIME type
        const mimeType = options?.mimeType || getSupportedMimeType()

        if (!mimeType) {
          throw new Error('No supported MIME type found for recording')
        }

        // Create MediaRecorder instance
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: options?.audioBitsPerSecond || 128000,
          videoBitsPerSecond: options?.videoBitsPerSecond || 2500000
        })

        const chunks: Blob[] = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data)
            setRecordedChunks((prev) => [...prev, event.data])
          }
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType })
          setRecordedBlob(blob)
          setIsRecording(false)
          setIsPaused(false)

          if (timeIntervalRef.current) {
            clearInterval(timeIntervalRef.current)
            timeIntervalRef.current = null
          }
        }

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event)
          setError('Recording error occurred')
          setIsRecording(false)
        }

        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start(100) // Collect data every 100ms
        setIsRecording(true)

        // Start timing
        startTimeRef.current = Date.now()
        timeIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current
          setRecordingTime(Math.floor(elapsed / 1000))
        }, 100)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start recording'
        setError(errorMessage)
        console.error('Error starting recording:', err)
      }
    },
    []
  )

  /**
   * Stop the current recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()

      // Stop all tracks in the stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }, [isRecording])

  /**
   * Pause the current recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current
    }
  }, [isRecording, isPaused])

  /**
   * Resume a paused recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      startTimeRef.current = Date.now()
    }
  }, [isRecording, isPaused])

  /**
   * Clear the recorded data
   */
  const clearRecording = useCallback(() => {
    setRecordedChunks([])
    setRecordedBlob(null)
    setRecordingTime(0)
    setError(null)
  }, [])

  /**
   * Download the recorded media as a file
   */
  const downloadRecording = useCallback(
    (filename: string) => {
      if (!recordedBlob) {
        setError('No recording available to download')
        return
      }

      try {
        const url = URL.createObjectURL(recordedBlob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()

        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }, 100)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to download recording'
        setError(errorMessage)
        console.error('Error downloading recording:', err)
      }
    },
    [recordedBlob]
  )

  return {
    isRecording,
    isPaused,
    recordingTime,
    recordedChunks,
    recordedBlob,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    downloadRecording
  }
}

/**
 * Get the first supported MIME type for recording
 */
function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm',
    'audio/webm;codecs=opus',
    'audio/webm',
    'video/mp4',
    'audio/mp4'
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return null
}

/**
 * Format recording time as MM:SS
 */
export function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
