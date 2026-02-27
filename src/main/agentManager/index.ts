export { AgentManager } from './AgentManager'
export { AgentSession } from './AgentSession'
export { executeAgentStream } from './AgentExecutor'
export type {
  AgentSessionConfig,
  AgentRequest,
  AgentStreamEvent,
  AgentSessionSnapshot,
  AgentRunSnapshot,
  AgentManagerStatus,
} from './AgentManagerTypes'

// Named agent registry — must come after AgentManagerTypes to avoid circular refs
export { AgentRegistry, agentRegistry, buildSessionConfig } from './AgentRegistry'
export type { AgentDefinition, AgentDefinitionInfo } from './AgentDefinition'

// Side-effect import: populates agentRegistry with all built-in agent definitions.
// Any module that imports from 'src/main/agentManager' will automatically have
// all agents registered without needing an explicit import of the agents barrel.
import './agents'
