/**
 * AgentRegistry — singleton registry of all named AgentDefinitions.
 *
 * Agent files self-register by importing `agentRegistry` and calling
 * `agentRegistry.register(definition)` as a module side effect.  The barrel
 * at `agents/index.ts` triggers those side effects in one import.
 *
 * Callers that need a live session config should use `buildSessionConfig()`.
 */

import type { AgentSessionConfig } from './AgentManagerTypes'
import { type AgentDefinition, type AgentDefinitionInfo, toAgentDefinitionInfo } from './AgentDefinition'

// ---------------------------------------------------------------------------
// Registry class
// ---------------------------------------------------------------------------

export class AgentRegistry {
  private readonly definitions = new Map<string, AgentDefinition>()

  /**
   * Register a named agent definition.
   * Throws if a definition with the same `id` has already been registered —
   * duplicate IDs indicate a programming error (copy-paste of an agent file).
   */
  register(def: AgentDefinition): void {
    if (this.definitions.has(def.id)) {
      throw new Error(
        `[AgentRegistry] Duplicate agent id "${def.id}". Each agent must have a unique id.`
      )
    }
    this.definitions.set(def.id, def)
  }

  /** Return the full definition for a given id, or `undefined` if not found. */
  get(id: string): AgentDefinition | undefined {
    return this.definitions.get(id)
  }

  /** Return all registered definitions in insertion order. */
  list(): AgentDefinition[] {
    return [...this.definitions.values()]
  }

  /**
   * Return all definitions as IPC-safe snapshots.
   * Use this whenever you need to send agent metadata to the renderer.
   */
  listInfo(): AgentDefinitionInfo[] {
    return this.list().map(toAgentDefinitionInfo)
  }

  /** Returns true when an agent with the given id has been registered. */
  has(id: string): boolean {
    return this.definitions.has(id)
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

/** Module-level singleton — import this from anywhere in the main process. */
export const agentRegistry = new AgentRegistry()

// ---------------------------------------------------------------------------
// Session config builder
// ---------------------------------------------------------------------------

/**
 * Merge an agent's `defaultConfig` with caller-supplied overrides and a
 * mandatory `providerId`, producing a fully-typed `AgentSessionConfig`.
 *
 * Precedence (highest → lowest):
 *   overrides  >  def.defaultConfig  >  AgentSession class defaults
 *
 * @param def        - The AgentDefinition to base the config on.
 * @param providerId - The active provider id (e.g. 'openai', 'anthropic').
 * @param overrides  - Any per-session overrides the caller wants to apply.
 */
export function buildSessionConfig(
  def: AgentDefinition,
  providerId: string,
  overrides: Partial<AgentSessionConfig> = {}
): AgentSessionConfig {
  return {
    ...def.defaultConfig,
    ...overrides,
    // providerId from argument always wins — it is the resolved, authoritative value
    providerId,
  }
}
