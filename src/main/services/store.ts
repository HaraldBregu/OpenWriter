import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { ProviderSettings, DEFAULT_PROVIDER_INFERENCE, InferenceDefaultsUpdate } from '../../shared/types/aiSettings'
import { MAX_RECENT_WORKSPACES } from '../constants'

// Re-export for backward compatibility with files that import ModelSettings from here
export type { ProviderSettings as ModelSettings }
export type { ProviderSettings }

export interface WorkspaceInfo {
  path: string
  lastOpened: number
}

export interface StoreSchema {
  modelSettings: Record<string, ProviderSettings>
  currentWorkspace: string | null
  recentWorkspaces: WorkspaceInfo[]
}

const DEFAULTS: StoreSchema = {
  modelSettings: {},
  currentWorkspace: null,
  recentWorkspaces: []
}

export class StoreService {
  private filePath: string
  private data: StoreSchema

  constructor() {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'settings.json')
    this.data = this.load()
  }

  private load(): StoreSchema {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<StoreSchema>
      const merged: StoreSchema = { ...DEFAULTS, ...parsed }

      // Migrate each provider record to the full ProviderSettings shape
      const migratedModelSettings: Record<string, ProviderSettings> = {}
      for (const [providerId, record] of Object.entries(merged.modelSettings)) {
        migratedModelSettings[providerId] = this.migrateProviderSettings(record)
      }
      merged.modelSettings = migratedModelSettings

      return merged
    } catch {
      return { ...DEFAULTS }
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  /**
   * Fills in missing inference fields on an old settings record read from disk.
   * Old records may only have { selectedModel, apiToken }; this adds temperature,
   * maxTokens, and reasoning from DEFAULT_PROVIDER_INFERENCE when absent.
   */
  private migrateProviderSettings(
    record: Partial<ProviderSettings> & { selectedModel?: string; apiToken?: string }
  ): ProviderSettings {
    return {
      selectedModel: record.selectedModel ?? '',
      apiToken: record.apiToken ?? '',
      temperature: record.temperature ?? DEFAULT_PROVIDER_INFERENCE.temperature,
      maxTokens: record.maxTokens !== undefined ? record.maxTokens : DEFAULT_PROVIDER_INFERENCE.maxTokens,
      reasoning: record.reasoning ?? DEFAULT_PROVIDER_INFERENCE.reasoning
    }
  }

  // --- New provider settings methods ---

  getProviderSettings(providerId: string): ProviderSettings | null {
    return this.data.modelSettings[providerId] ?? null
  }

  getAllProviderSettings(): Record<string, ProviderSettings> {
    return { ...this.data.modelSettings }
  }

  setProviderSettings(providerId: string, settings: ProviderSettings): void {
    this.data.modelSettings[providerId] = { ...settings }
    this.save()
  }

  setInferenceDefaults(providerId: string, update: InferenceDefaultsUpdate): void {
    const existing = this.data.modelSettings[providerId] ?? this.migrateProviderSettings({})
    this.data.modelSettings[providerId] = {
      ...existing,
      ...(update.temperature !== undefined && { temperature: update.temperature }),
      ...(update.maxTokens !== undefined && { maxTokens: update.maxTokens }),
      ...(update.reasoning !== undefined && { reasoning: update.reasoning })
    }
    this.save()
  }

  // --- Legacy methods (delegate to new methods for backward compatibility) ---

  getModelSettings(providerId: string): ProviderSettings | null {
    return this.getProviderSettings(providerId)
  }

  getAllModelSettings(): Record<string, ProviderSettings> {
    return this.getAllProviderSettings()
  }

  setSelectedModel(providerId: string, modelId: string): void {
    console.log(`[Store] setSelectedModel: provider=${providerId} model=${modelId}`)
    const existing = this.data.modelSettings[providerId] ?? this.migrateProviderSettings({})
    this.data.modelSettings[providerId] = {
      ...existing,
      selectedModel: modelId
    }
    this.save()
  }

  setApiToken(providerId: string, token: string): void {
    console.log(`[Store] setApiToken: provider=${providerId} token=${token ? '(set)' : '(cleared)'}`)
    const existing = this.data.modelSettings[providerId] ?? this.migrateProviderSettings({})
    this.data.modelSettings[providerId] = {
      ...existing,
      apiToken: token
    }
    this.save()
  }

  setModelSettings(providerId: string, settings: ProviderSettings): void {
    this.setProviderSettings(providerId, settings)
  }

  // --- Workspace settings ---

  getCurrentWorkspace(): string | null {
    return this.data.currentWorkspace
  }

  setCurrentWorkspace(workspacePath: string): void {
    this.data.currentWorkspace = workspacePath
    this.addRecentWorkspace(workspacePath)
    this.save()
  }

  getRecentWorkspaces(): WorkspaceInfo[] {
    return [...this.data.recentWorkspaces]
  }

  private addRecentWorkspace(workspacePath: string): void {
    // Remove if already exists
    this.data.recentWorkspaces = this.data.recentWorkspaces.filter(
      (w) => w.path !== workspacePath
    )

    // Add to front
    this.data.recentWorkspaces.unshift({
      path: workspacePath,
      lastOpened: Date.now()
    })

    // Keep only last MAX_RECENT_WORKSPACES entries
    this.data.recentWorkspaces = this.data.recentWorkspaces.slice(0, MAX_RECENT_WORKSPACES)
  }

  clearCurrentWorkspace(): void {
    this.data.currentWorkspace = null
    this.save()
  }

  removeRecentWorkspace(workspacePath: string): void {
    this.data.recentWorkspaces = this.data.recentWorkspaces.filter(
      (w) => w.path !== workspacePath
    )
    this.save()
  }
}
