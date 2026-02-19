import React from 'react'
import { Link } from 'react-router-dom'
import {
  Newspaper,
  PenLine,
  StickyNote,
  MessageSquare,
  FolderOpen,
  Puzzle,
  ArrowRight,
  Clock,
  Star
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Quick-action cards
// ---------------------------------------------------------------------------

const quickActions = [
  {
    icon: PenLine,
    label: 'New Writing',
    description: 'Start a blank document',
    url: '/writing',
    accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
  },
  {
    icon: StickyNote,
    label: 'New Note',
    description: 'Capture a quick thought',
    url: '/notes',
    accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  },
  {
    icon: Newspaper,
    label: 'New Post',
    description: 'Publish to your audience',
    url: '/posts',
    accent: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
  },
  {
    icon: MessageSquare,
    label: 'Messages',
    description: 'View conversations',
    url: '/messages',
    accent: 'bg-green-500/10 text-green-600 dark:text-green-400'
  }
]

// ---------------------------------------------------------------------------
// Placeholder recent items
// ---------------------------------------------------------------------------

const recentItems = [
  { icon: PenLine, label: 'Q1 Strategy Brief', meta: '2 hours ago', url: '/writing' },
  { icon: StickyNote, label: 'Product Ideas', meta: 'Yesterday', url: '/notes' },
  { icon: Newspaper, label: 'Release Announcement', meta: '3 days ago', url: '/posts' },
  { icon: FolderOpen, label: 'Design Assets', meta: 'Last week', url: '/documents/local' }
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QuickActionCard({
  icon: Icon,
  label,
  description,
  url,
  accent
}: (typeof quickActions)[number]) {
  return (
    <Link
      to={url}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-5 hover:border-border/80 hover:shadow-sm transition-all"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all mt-auto self-end" />
    </Link>
  )
}

function RecentItem({
  icon: Icon,
  label,
  meta,
  url
}: (typeof recentItems)[number]) {
  return (
    <Link
      to={url}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors group"
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
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const HomePage: React.FC = () => {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-12 space-y-10">

        {/* Hero */}
        <div>
          <h1 className="text-2xl font-medium text-foreground tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            What would you like to work on today?
          </p>
        </div>

        {/* Quick actions */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Quick actions
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickActions.map((action) => (
              <QuickActionCard key={action.url} {...action} />
            ))}
          </div>
        </section>

        {/* Recent */}
        <section className="space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent
            </h2>
            <Link
              to="/documents/local"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
            {recentItems.map((item) => (
              <RecentItem key={item.label} {...item} />
            ))}
          </div>
        </section>

        {/* Explore */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Explore
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              to="/documents/local"
              className="flex items-center gap-4 rounded-xl border border-border bg-background px-5 py-4 hover:shadow-sm hover:border-border/80 transition-all group"
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Documents</p>
                <p className="text-xs text-muted-foreground mt-0.5">Browse your files</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
            </Link>

            <Link
              to="/integrations"
              className="flex items-center gap-4 rounded-xl border border-border bg-background px-5 py-4 hover:shadow-sm hover:border-border/80 transition-all group"
            >
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Puzzle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Integrations</p>
                <p className="text-xs text-muted-foreground mt-0.5">Connect your tools</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
            </Link>
          </div>
        </section>

        {/* Tips */}
        <section className="rounded-xl border border-border bg-background px-5 py-4 flex items-start gap-3">
          <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Tip</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Use the sidebar to navigate between Posts, Writing, Notes, and Messages.
              Press the menu icon in the title bar to toggle the sidebar.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}

export default HomePage
