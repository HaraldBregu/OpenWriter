/**
 * AIAgentsRegistry — registry of all named AIAgentsDefinitions.
 *
 * Instantiated once in bootstrapServices() and registered in ServiceContainer
 * as 'AIAgentsRegistry', following the same pattern as TaskHandlerRegistry.
 * Definitions are registered explicitly in bootstrap — not via module side effects.
 *
 * Callers that need a live session config should use `buildSessionConfig()`.
 */

import type { AgentSessionConfig } from './aiAgentsManagerTypes'
import { type AIAgentsDefinition, type AIAgentsDefinitionInfo, toAIAgentsDefinitionInfo } from './AIAgentsDefinition'

// ---------------------------------------------------------------------------
// Registry class
// ---------------------------------------------------------------------------

export class AIAgentsRegistry {
  private readonly definitions = new Map<string, AIAgentsDefinition>()

  /**
   * Register a named agent definition.
   * Throws if a definition with the same `id` has already been registered —
   * duplicate IDs indicate a programming error (copy-paste of an agent file).
   */
  register(def: AIAgentsDefinition): void {
    if (this.definitions.has(def.id)) {
      throw new Error(
        `[AIAgentsRegistry] Duplicate agent id "${def.id}". Each agent must have a unique id.`
      )
    }
    this.definitions.set(def.id, def)
  }

  /** Return the full definition for a given id, or `undefined` if not found. */
  get(id: string): AIAgentsDefinition | undefined {
    return this.definitions.get(id)
  }

  /** Return all registered definitions in insertion order. */
  list(): AIAgentsDefinition[] {
    return [...this.definitions.values()]
  }

  /**
   * Return all definitions as IPC-safe snapshots.
   * Use this whenever you need to send agent metadata to the renderer.
   */
  listInfo(): AIAgentsDefinitionInfo[] {
    return this.list().map(toAIAgentsDefinitionInfo)
  }

  /** Returns true when an agent with the given id has been registered. */
  has(id: string): boolean {
    return this.definitions.has(id)
  }
}

// ---------------------------------------------------------------------------
// Session config builder
// ---------------------------------------------------------------------------

/**
 * Merge an agent's `defaultConfig` with caller-supplied overrides and a
 * mandatory `providerId`, producing a fully-typed `AgentSessionConfig`.
 *
 * Precedence (highest → lowest):
 *   overrides  >  def.defaultConfig  >  AIAgentsSession class defaults
 *
 * @param def        - The AIAgentsDefinition to base the config on.
 * @param providerId - The active provider id (e.g. 'openai', 'anthropic').
 * @param overrides  - Any per-session overrides the caller wants to apply.
 */
export function buildSessionConfig(
  def: AIAgentsDefinition,
  providerId: string,
  overrides: Partial<AgentSessionConfig> = {}
): AgentSessionConfig {
  return {
    ...def.defaultConfig,
    ...overrides,
    // providerId from argument always wins — it is the resolved, authoritative value
    providerId,
    // Carry the graph factory through so AIAgentsSession can use it at run time.
    // Overrides can replace this by explicitly setting buildGraph: undefined.
    buildGraph: overrides.buildGraph ?? def.buildGraph,
  }
}
