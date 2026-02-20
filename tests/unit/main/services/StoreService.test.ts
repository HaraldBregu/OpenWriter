/**
 * Tests for StoreService.
 * Validates JSON-based settings persistence for model settings and workspaces.
 */

// Mock node:fs before importing the service
jest.mock('node:fs', () => ({
  readFileSync: jest.fn().mockImplementation(() => {
    throw new Error('ENOENT')
  }),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}))

import { app } from 'electron'
import fs from 'node:fs'
import { StoreService } from '../../../../src/main/services/store'

describe('StoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(app.getPath as jest.Mock).mockReturnValue('/fake/userData')
    // Default: return clean empty defaults from file (avoids DEFAULTS object mutation leaking between tests)
    ;(fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({ modelSettings: {}, currentWorkspace: null, recentWorkspaces: [] })
    )
  })

  describe('constructor', () => {
    it('should create service with defaults when no settings file exists', () => {
      ;(fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('ENOENT')
      })
      const service = new StoreService()
      expect(service.getCurrentWorkspace()).toBeNull()
      expect(service.getRecentWorkspaces()).toEqual([])
      expect(service.getAllModelSettings()).toEqual({})
    })

    it('should load existing settings from JSON file', () => {
      ;(fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
          modelSettings: { openai: { selectedModel: 'gpt-4', apiToken: 'tok' } },
          currentWorkspace: '/my/workspace',
          recentWorkspaces: [{ path: '/my/workspace', lastOpened: 1000 }]
        })
      )
      const service = new StoreService()
      expect(service.getCurrentWorkspace()).toBe('/my/workspace')
      expect(service.getModelSettings('openai')).toEqual({
        selectedModel: 'gpt-4',
        apiToken: 'tok'
      })
    })
  })

  describe('model settings', () => {
    it('should return null for unknown provider', () => {
      const service = new StoreService()
      expect(service.getModelSettings('unknown')).toBeNull()
    })

    it('should set and get selected model', () => {
      const service = new StoreService()
      service.setSelectedModel('openai', 'gpt-4o')
      const settings = service.getModelSettings('openai')
      expect(settings).not.toBeNull()
      expect(settings!.selectedModel).toBe('gpt-4o')
      expect(settings!.apiToken).toBe('')
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should preserve existing apiToken when setting model', () => {
      const service = new StoreService()
      service.setApiToken('openai', 'my-token')
      service.setSelectedModel('openai', 'gpt-4o-mini')
      const settings = service.getModelSettings('openai')
      expect(settings!.apiToken).toBe('my-token')
      expect(settings!.selectedModel).toBe('gpt-4o-mini')
    })

    it('should set API token', () => {
      const service = new StoreService()
      service.setApiToken('anthropic', 'sk-123')
      const settings = service.getModelSettings('anthropic')
      expect(settings!.apiToken).toBe('sk-123')
    })

    it('should set full model settings', () => {
      const service = new StoreService()
      service.setModelSettings('custom', { selectedModel: 'llama', apiToken: 'key' })
      expect(service.getModelSettings('custom')).toEqual({
        selectedModel: 'llama',
        apiToken: 'key'
      })
    })

    it('should return all model settings', () => {
      const service = new StoreService()
      service.setSelectedModel('a', 'model-a')
      service.setSelectedModel('b', 'model-b')
      const all = service.getAllModelSettings()
      expect(Object.keys(all)).toHaveLength(2)
    })
  })

  describe('workspace settings', () => {
    it('should set and get current workspace', () => {
      const service = new StoreService()
      service.setCurrentWorkspace('/path/to/project')
      expect(service.getCurrentWorkspace()).toBe('/path/to/project')
    })

    it('should add workspace to recent workspaces', () => {
      const service = new StoreService()
      service.setCurrentWorkspace('/project1')
      service.setCurrentWorkspace('/project2')
      const recent = service.getRecentWorkspaces()
      expect(recent[0].path).toBe('/project2')
      expect(recent[1].path).toBe('/project1')
    })

    it('should not duplicate recent workspaces', () => {
      const service = new StoreService()
      service.setCurrentWorkspace('/project1')
      service.setCurrentWorkspace('/project2')
      service.setCurrentWorkspace('/project1')
      const recent = service.getRecentWorkspaces()
      // /project1 should appear only once (moved to front)
      const paths = recent.map((w) => w.path)
      expect(paths.filter((p) => p === '/project1')).toHaveLength(1)
      expect(paths[0]).toBe('/project1')
    })

    it('should keep only last 10 recent workspaces', () => {
      const service = new StoreService()
      for (let i = 0; i < 15; i++) {
        service.setCurrentWorkspace(`/project${i}`)
      }
      expect(service.getRecentWorkspaces()).toHaveLength(10)
    })

    it('should clear current workspace', () => {
      const service = new StoreService()
      service.setCurrentWorkspace('/project')
      service.clearCurrentWorkspace()
      expect(service.getCurrentWorkspace()).toBeNull()
      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    it('should return a copy of recent workspaces', () => {
      const service = new StoreService()
      service.setCurrentWorkspace('/test')
      const recent1 = service.getRecentWorkspaces()
      recent1.push({ path: '/fake', lastOpened: 0 })
      expect(service.getRecentWorkspaces()).toHaveLength(1)
    })
  })

  describe('persistence', () => {
    it('should create directory before writing', () => {
      const service = new StoreService()
      service.setSelectedModel('test', 'model')
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true })
    })

    it('should write JSON to the settings file', () => {
      const service = new StoreService()
      service.setSelectedModel('test', 'model')
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('settings.json'),
        expect.any(String),
        'utf-8'
      )
      // Verify the written JSON is valid
      const writtenJson = (fs.writeFileSync as jest.Mock).mock.calls[0][1]
      expect(() => JSON.parse(writtenJson)).not.toThrow()
    })
  })
})
