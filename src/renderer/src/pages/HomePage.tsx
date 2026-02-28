import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  PenLine,
  FolderOpen,
  Puzzle,
  ArrowRight,
  Clock,
  Star
} from 'lucide-react'
import { AppSeparator } from '@/components/app'
import { useAppSelector } from '../store'
import { selectWritingEntries, type WritingEntry } from '../store/writingItemsSlice'
import { useCreateWriting } from '../hooks/useCreateWriting'

// ---------------------------------------------------------------------------
// Category definitions — labels resolved via i18n at render time
// ---------------------------------------------------------------------------

const categoryDefs = [
  {
    icon: PenLine,
    labelKey: 'home.writing',
    descriptionKey: 'home.writingDescription',
    accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TFunction = (key: string, options?: Record<string, unknown>) => string

function formatRelativeTime(timestamp: number, t: TFunction): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return t('relativeTime.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('relativeTime.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('relativeTime.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('relativeTime.daysAgo', { count: days })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CategoryCardProps {
  icon: React.ElementType
  labelKey: string
  descriptionKey: string
  accent: string
  onClick: () => void
  disabled?: boolean
}

const CategoryCard = React.memo(function CategoryCard({
  icon: Icon,
  labelKey,
  descriptionKey,
  accent,
  onClick,
  disabled,
}: CategoryCardProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-5 hover:border-border/80 hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t(descriptionKey)}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all mt-auto self-end" />
    </button>
  )
})
CategoryCard.displayName = 'CategoryCard'

interface RecentWritingItemProps {
  entry: WritingEntry
}

const RecentWritingItem = React.memo(function RecentWritingItem({
  entry,
}: RecentWritingItemProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    navigate(`/content/${entry.id}`)
  }, [navigate, entry.id])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors group w-full text-left"
    >
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {entry.title || t('writing.untitled')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(entry.savedAt, t)}
        </p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
    </button>
  )
})
RecentWritingItem.displayName = 'RecentWritingItem'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const HomePage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Pull the 5 most-recently-saved writing entries from Redux.
  // writingItemsSlice keeps entries sorted by savedAt (newest first).
  const allEntries = useAppSelector(selectWritingEntries)
  const recentEntries = allEntries.slice(0, 5)

  const { createWriting, isLoading: isCreatingWriting } = useCreateWriting({
    onSuccess: (writingId) => {
      navigate(`/new/writing/${writingId}`)
    },
  })

  const handleNewWriting = useCallback(async () => {
    await createWriting()
  }, [createWriting])

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? t('home.goodMorning') : hour < 18 ? t('home.goodAfternoon') : t('home.goodEvening')

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-12 space-y-10">

        {/* Hero */}
        <div>
          <h1 className="text-2xl font-medium text-foreground tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('home.workOnToday')}
          </p>
        </div>

        {/* Categories */}
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {categoryDefs.map((cat) => (
              <CategoryCard
                key={cat.labelKey}
                icon={cat.icon}
                labelKey={cat.labelKey}
                descriptionKey={cat.descriptionKey}
                accent={cat.accent}
                onClick={handleNewWriting}
                disabled={isCreatingWriting}
              />
            ))}
          </div>
        </section>

        <AppSeparator />

        {/* Recent writings */}
        <section className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('home.recent')}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/documents/local')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {t('home.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recentEntries.length > 0 ? (
            <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
              {recentEntries.map((entry) => (
                <RecentWritingItem key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-3 px-1">
              {t('home.noRecentWritings')}
            </p>
          )}
        </section>

        <AppSeparator />

        {/* Documents & Integrations */}
        <section className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/documents/local')}
              className="flex items-center gap-4 rounded-xl border border-border bg-background px-5 py-4 hover:shadow-sm hover:border-border/80 transition-all group text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t('home.documents')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('home.documentsDescription')}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/integrations')}
              className="flex items-center gap-4 rounded-xl border border-border bg-background px-5 py-4 hover:shadow-sm hover:border-border/80 transition-all group text-left"
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Puzzle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t('home.integrations')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('home.integrationsDescription')}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
            </button>
          </div>
        </section>

        <AppSeparator />

        {/* Tips */}
        <section className="rounded-xl border border-border bg-background px-5 py-4 flex items-start gap-3">
          <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('home.tip')}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {t('home.tipContent')}
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}

export default HomePage
