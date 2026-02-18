import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

export interface ModelSettings {
  selectedModel: string
  apiToken: string
}

export interface StoreSchema {
  modelSettings: Record<string, ModelSettings>
}

const DEFAULTS: StoreSchema = {
  modelSettings: {}
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
      return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {
      return { ...DEFAULTS }
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  // --- Model settings ---

  getModelSettings(providerId: string): ModelSettings | null {
    return this.data.modelSettings[providerId] ?? null
  }

  getAllModelSettings(): Record<string, ModelSettings> {
    return { ...this.data.modelSettings }
  }

  setSelectedModel(providerId: string, modelId: string): void {
    console.log(`[Store] setSelectedModel: provider=${providerId} model=${modelId}`)
    this.data.modelSettings[providerId] = {
      ...this.data.modelSettings[providerId],
      selectedModel: modelId,
      apiToken: this.data.modelSettings[providerId]?.apiToken ?? ''
    }
    this.save()
  }

  setApiToken(providerId: string, token: string): void {
    console.log(`[Store] setApiToken: provider=${providerId} token=${token ? '(set)' : '(cleared)'}`)
    this.data.modelSettings[providerId] = {
      ...this.data.modelSettings[providerId],
      selectedModel: this.data.modelSettings[providerId]?.selectedModel ?? '',
      apiToken: token
    }
    this.save()
  }

  setModelSettings(providerId: string, settings: ModelSettings): void {
    this.data.modelSettings[providerId] = settings
    this.save()
  }
}
