import React from 'react'
import { useTranslation } from 'react-i18next'

/**
 * ModelsSettings
 *
 * Placeholder — AI settings slice has been removed.
 * Model configuration will be re-implemented as part of the new provider system.
 */
const ModelsSettings: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-full p-6 space-y-8">
      <div>
        <h1 className="text-lg font-normal">{t('settings.models.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('settings.models.description')}</p>
      </div>
      <p className="text-sm text-muted-foreground">{t('settings.models.comingSoon') || 'Model configuration coming soon.'}</p>
    </div>
  )
}

export default ModelsSettings
