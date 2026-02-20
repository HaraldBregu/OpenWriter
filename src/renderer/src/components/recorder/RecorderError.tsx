import { useRecorderController } from './RecorderProvider'

export function RecorderError() {
  const { error } = useRecorderController()

  if (!error) return null

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <p className="text-red-800 dark:text-red-300 font-semibold">Error:</p>
      <p className="text-red-600 dark:text-red-400">{error}</p>
    </div>
  )
}
