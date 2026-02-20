/**
 * Registry for pipeline agents.
 *
 * Agents are registered by name during bootstrap and looked up at runtime
 * when the renderer requests a pipeline run. This keeps the mapping in one
 * place and makes it trivial to add new agents: implement the Agent
 * interface, then call registry.register(agent) in bootstrap.ts.
 */

import type { Agent } from './AgentBase'

export class AgentRegistry {
  private agents = new Map<string, Agent>()

  /**
   * Register an agent. Throws if a name collision is detected.
   */
  register(agent: Agent): void {
    if (this.agents.has(agent.name)) {
      throw new Error(`[AgentRegistry] Agent "${agent.name}" is already registered`)
    }
    this.agents.set(agent.name, agent)
    console.log(`[AgentRegistry] Registered agent: ${agent.name}`)
  }

  /**
   * Look up an agent by name. Returns undefined if not found.
   */
  get(name: string): Agent | undefined {
    return this.agents.get(name)
  }

  /**
   * Check whether an agent with the given name exists.
   */
  has(name: string): boolean {
    return this.agents.has(name)
  }

  /**
   * Return the names of all registered agents.
   */
  listNames(): string[] {
    return Array.from(this.agents.keys())
  }
}
