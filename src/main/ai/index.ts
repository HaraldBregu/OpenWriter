/**
 * ai/index.ts — AI subsystem barrel.
 *
 * Definitions are plain exported constants. Registration is done explicitly
 * in bootstrapServices() via AgentRegistry.register(), following the same
 * pattern as TaskHandlerRegistry — visible, ordered, and test-isolation safe.
 */

// Core
export type { AgentDefinition, AgentDefinitionInfo } from './core';
export { toAgentDefinitionInfo, AgentRegistry, executeAIAgentsStream } from './core';
export type { ExecutorInput, AgentStreamEvent, AgentRequest, AgentHistoryMessage } from './core';

// Registry
export { ModelRegistry } from './registry';
export type { ModelRole, ModelRoleConfig, CostTier } from './registry';

// Agents
export { TextContinuationAgent } from './agents';
