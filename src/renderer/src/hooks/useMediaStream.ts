import { useState, useCallback, useRef, useEffect } from 'react'

interface UseMediaStreamOptions {
  audio?: boolean | MediaTrackConstraints
  video?: boolean | MediaTrackConstraints
}

interface UseMediaStreamReturn {
  stream: MediaStream | null
  isStreaming: boolean
  error: string | null
  startStream: (options?: UseMediaStreamOptions) => Promise<void>
  stopStream: () => void
}

/**
 * React hook for managing media streams from camera and microphone
 * Provides controls for starting and stopping media capture
 */
export function useMediaStream(): UseMediaStreamReturn {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  /**
   * Start capturing media stream
   */
  const startStream = useCallback(async (options: UseMediaStreamOptions = { audio: true, video: true }) => {
    try {
      setError(null)

      // Request media stream from browser
      const mediaStream = await navigator.mediaDevices.getUserMedia(options)

      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsStreaming(true)
    } catch (err) {
      let errorMessage = 'Failed to access media devices'

      if (err instanceof Error) {
        // Provide user-friendly error messages
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Permission denied. Please grant camera/microphone access.'
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera or microphone found.'
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Device is already in use by another application.'
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Requested media constraints cannot be satisfied.'
        } else if (err.name === 'TypeError') {
          errorMessage = 'Invalid media constraints.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      console.error('Error accessing media devices:', err)
      setIsStreaming(false)
    }
  }, [])

  /**
   * Stop the current media stream
   */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
      setStream(null)
      setIsStreaming(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return {
    stream,
    isStreaming,
    error,
    startStream,
    stopStream
  }
}
