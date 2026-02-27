/**
 * AgentDefinition — describes a named, pre-configured agent.
 *
 * Named agents sit above raw AgentSessionConfig: they carry human-readable
 * metadata (name, description, category) alongside a set of opinionated
 * defaults that callers can optionally override at session-creation time.
 */

import type { AgentSessionConfig } from './AgentManagerTypes'

// ---------------------------------------------------------------------------
// Core definition
// ---------------------------------------------------------------------------

export interface AgentDefinition {
  /** Unique machine-readable identifier, e.g. 'story-writer' */
  id: string
  /** Human-readable display name shown in the UI */
  name: string
  /** Short description of the agent's purpose and behaviour */
  description: string
  /** Category used for grouping / filtering in the UI */
  category: 'writing' | 'editing' | 'analysis' | 'utility'
  /**
   * Default session configuration.
   *
   * `providerId` is intentionally optional here: callers must supply a
   * concrete `providerId` (e.g. resolved from the user's active provider
   * setting) when converting this definition into a live AgentSessionConfig
   * via `buildSessionConfig()`.
   */
  defaultConfig: Omit<AgentSessionConfig, 'providerId'> & { providerId?: string }
  /** Optional hints consumed by the UI to render the input form correctly. */
  inputHints?: {
    label: string
    placeholder: string
    multiline?: boolean
  }
}

// ---------------------------------------------------------------------------
// Serializable snapshot — safe to transmit over Electron IPC
// ---------------------------------------------------------------------------

export interface AgentDefinitionInfo {
  id: string
  name: string
  description: string
  category: AgentDefinition['category']
  inputHints?: AgentDefinition['inputHints']
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Strip non-serializable / internal fields and return a plain object that is
 * safe to send from the main process to a renderer window via IPC.
 */
export function toAgentDefinitionInfo(def: AgentDefinition): AgentDefinitionInfo {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    category: def.category,
    inputHints: def.inputHints,
  }
}
