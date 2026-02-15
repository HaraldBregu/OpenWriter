import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCron } from '../hooks/useCron'
import { useTheme } from '../hooks/useTheme'
import { useLanguage } from '../hooks/useLanguage'
import { Clock, Play, Square, Trash2, Plus, RefreshCw, Calendar, CheckCircle, XCircle } from 'lucide-react'

const CronPage: React.FC = () => {
  const { t } = useTranslation()
  const {
    jobs,
    lastResult,
    loading,
    error,
    refreshJobs,
    startJob,
    stopJob,
    deleteJob,
    createJob,
    validateExpression
  } = useCron()
  useTheme()
  useLanguage()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newJob, setNewJob] = useState({
    id: '',
    name: '',
    schedule: '* * * * *',
    description: ''
  })
  const [validationResult, setValidationResult] = useState<{ valid: boolean; description?: string; error?: string } | null>(null)

  const handleValidate = async () => {
    const result = await validateExpression(newJob.schedule)
    setValidationResult(result)
  }

  const handleCreateJob = async () => {
    if (!newJob.id || !newJob.name || !newJob.schedule) {
      alert(t('cron.fillAllFields'))
      return
    }

    const success = await createJob({
      id: newJob.id,
      name: newJob.name,
      schedule: newJob.schedule,
      enabled: false,
      runCount: 0,
      description: newJob.description
    })

    if (success) {
      setShowCreateForm(false)
      setNewJob({ id: '', name: '', schedule: '* * * * *', description: '' })
      setValidationResult(null)
    }
  }

  const formatDate = (date?: Date) => {
    if (!date) return t('cron.never')
    return new Date(date).toLocaleString()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">⏰ {t('cron.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('cron.description')}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 font-semibold">{t('cron.error')}</p>
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Last Result */}
      {lastResult && (
        <div className={`border rounded-lg p-4 ${
          lastResult.success
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-3">
            {lastResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${
                lastResult.success
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}>
                {t('cron.lastExecution')}: {lastResult.id}
              </p>
              <p className={`text-sm ${
                lastResult.success
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {lastResult.message} - {formatDate(new Date(lastResult.timestamp))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={refreshJobs}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('cron.refresh')}
        </button>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('cron.createJob')}
        </button>
      </div>

      {/* Create Job Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t('cron.newJob')}</h2>

          <div>
            <label className="block text-sm font-medium mb-2">{t('cron.jobId')}</label>
            <input
              type="text"
              value={newJob.id}
              onChange={(e) => setNewJob({ ...newJob, id: e.target.value })}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="my-job"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('cron.jobName')}</label>
            <input
              type="text"
              value={newJob.name}
              onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="My Job"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('cron.schedule')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newJob.schedule}
                onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
                className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                placeholder="* * * * *"
              />
              <button
                onClick={handleValidate}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg"
              >
                {t('cron.validate')}
              </button>
            </div>
            {validationResult && (
              <p className={`mt-2 text-sm ${validationResult.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {validationResult.valid ? validationResult.description : validationResult.error}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('cron.description')}</label>
            <textarea
              value={newJob.description}
              onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={3}
              placeholder={t('cron.descriptionPlaceholder')}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateJob}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg"
            >
              {t('cron.create')}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false)
                setValidationResult(null)
              }}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold rounded-lg"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Cron Jobs List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('cron.scheduledJobs')}
        </h2>

        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">{t('cron.noJobs')}</p>
              <p className="text-sm mt-2">{t('cron.createFirstJob')}</p>
            </div>
          ) : (
            jobs.map((job) => (
              <div
                key={job.id}
                className={`p-4 border dark:border-gray-700 rounded-lg ${
                  job.running
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{job.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        job.running
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {job.running ? t('cron.running') : t('cron.stopped')}
                      </span>
                    </div>

                    {job.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {job.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t('cron.schedule')}:</span>
                        <p className="font-mono font-medium">{job.schedule}</p>
                        {job.humanReadable && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">{job.humanReadable}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t('cron.nextRun')}:</span>
                        <p className="font-medium">{formatDate(job.nextRun)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t('cron.lastRun')}:</span>
                        <p className="font-medium">{formatDate(job.lastRun)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t('cron.runCount')}:</span>
                        <p className="font-medium">{job.runCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {job.running ? (
                      <button
                        onClick={() => stopJob(job.id)}
                        className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                        title={t('cron.stop')}
                      >
                        <Square className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => startJob(job.id)}
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        title={t('cron.start')}
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(t('cron.confirmDelete', { name: job.name }))) {
                          deleteJob(job.id)
                        }
                      }}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                      title={t('cron.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>{t('cron.note')}</strong> {t('cron.cronInfo')}
        </p>
        <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside mt-2 space-y-1">
          <li>{t('cron.cronFormat')}</li>
          <li>{t('cron.exampleEveryMinute')}</li>
          <li>{t('cron.exampleEveryHour')}</li>
          <li>{t('cron.exampleDaily')}</li>
        </ul>
      </div>
    </div>
  )
}

export default CronPage
