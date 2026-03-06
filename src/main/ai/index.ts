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
export {
	StoryWriterAgent,
	TextCompleterAgent,
	ContentReviewAgent,
	SummarizerAgent,
	ToneAdjusterAgent,
	DemoAgent,
	TextContinuationAgent,
	SentenceCompleterAgent,
} from './agents';

import { StoryWriterAgent } from './agents';
import { TextCompleterAgent } from './agents';
import { ContentReviewAgent } from './agents';
import { SummarizerAgent } from './agents';
import { ToneAdjusterAgent } from './agents';
import { DemoAgent } from './agents';
import { TextContinuationAgent } from './agents';
import { SentenceCompleterAgent } from './agents';
import type { AgentDefinition } from './core';

/**
 * All built-in agent definitions in display order.
 * Pass this to AgentRegistry.register() in bootstrapServices().
 */
export const ALL_AGENT_DEFINITIONS: AgentDefinition[] = [
	StoryWriterAgent,
	TextCompleterAgent,
	ContentReviewAgent,
	SummarizerAgent,
	ToneAdjusterAgent,
	DemoAgent,
	TextContinuationAgent,
	SentenceCompleterAgent,
];
