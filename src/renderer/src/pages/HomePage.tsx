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

// ---------------------------------------------------------------------------
// Category definitions — labels resolved via i18n at render time
// ---------------------------------------------------------------------------

const categoryDefs = [
  {
    icon: PenLine,
    labelKey: 'home.writing',
    descriptionKey: 'home.writingDescription',
    route: '/new/writing',
    accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
]

// ---------------------------------------------------------------------------
// Placeholder recent items — labels are content placeholders, not UI strings
// ---------------------------------------------------------------------------

const recentItemDefs = [
  { icon: PenLine, label: 'Q1 Strategy Brief', meta: '2 hours ago', route: '/new/writing' },
  { icon: FolderOpen, label: 'Design Assets', meta: 'Last week', route: '/documents/local' }
] as const

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const CategoryCard = React.memo(function CategoryCard({
  icon: Icon,
  labelKey,
  descriptionKey,
  route,
  accent,
}: (typeof categoryDefs)[number]) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    navigate(route)
  }, [navigate, route])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-5 hover:border-border/80 hover:shadow-sm transition-all text-left"
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

const RecentItem = React.memo(function RecentItem({
  icon: Icon,
  label,
  meta,
  route,
}: (typeof recentItemDefs)[number]) {
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    navigate(route)
  }, [navigate, route])

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors group w-full text-left"
    >
      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {meta}
        </p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
    </button>
  )
})
RecentItem.displayName = 'RecentItem'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const HomePage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
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
              <CategoryCard key={cat.labelKey} {...cat} />
            ))}
          </div>
        </section>

        <AppSeparator />

        {/* Recent */}
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
          <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
            {recentItemDefs.map((item) => (
              <RecentItem key={item.label} {...item} />
            ))}
          </div>
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
