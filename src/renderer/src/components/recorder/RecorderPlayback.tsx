import React from 'react'
import { useRecorderController } from './RecorderProvider'

export function RecorderPlayback() {
  const { recordedBlob, playbackRef, isAudioOnly, handleDownload, clearRecording, recordingTime, formatTime } =
    useRecorderController()

  if (!recordedBlob) return null

  const title = isAudioOnly ? 'Recorded Audio' : 'Recorded Video'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {isAudioOnly ? (
        <audio ref={playbackRef as React.RefObject<HTMLAudioElement>} controls className="w-full" />
      ) : (
        <video
          ref={playbackRef as React.RefObject<HTMLVideoElement>}
          controls
          className="w-full rounded-lg bg-gray-900"
        />
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleDownload}
          className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
        >
          Download
        </button>
        <button
          onClick={clearRecording}
          className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>Size: {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB</p>
        <p>Type: {recordedBlob.type}</p>
        <p>Duration: {formatTime(recordingTime)}</p>
      </div>
    </div>
  )
}
