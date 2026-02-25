import React from 'react'
import { AlertCircle } from 'lucide-react'
import i18next from 'i18next'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onReset?: () => void
  level?: 'root' | 'route' | 'feature'
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    if (this.props.fallback) {
      return this.props.fallback
    }

    const { level = 'feature' } = this.props

    const t = (key: string): string => i18next.t(key)

    if (level === 'root') {
      return (
        <div className="flex h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-lg font-semibold text-foreground">{t('errorBoundary.rootTitle')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('errorBoundary.rootMessage')}
            </p>
            <p className="text-xs text-muted-foreground/60 font-mono break-all">
              {this.state.error?.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
            >
              {t('errorBoundary.restartApp')}
            </button>
          </div>
        </div>
      )
    }

    if (level === 'route') {
      return (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-base font-semibold text-foreground">{t('errorBoundary.routeTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('errorBoundary.routeMessage')}
            </p>
            <p className="text-xs text-muted-foreground/60 font-mono break-all">
              {this.state.error?.message}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
              >
                {t('errorBoundary.tryAgainButton')}
              </button>
              <button
                type="button"
                onClick={() => { window.location.hash = '#/home' }}
                className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
              >
                {t('errorBoundary.goHome')}
              </button>
            </div>
          </div>
        </div>
      )
    }

    // feature level
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">{t('errorBoundary.featureTitle')}</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono break-all">
          {this.state.error?.message}
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          {t('errorBoundary.tryAgain')}
        </button>
      </div>
    )
  }
}
