/**
 * AgentDefinition — describes a named, pre-configured agent.
 *
 * This module is intentionally self-contained: agent definitions are generic
 * components with no dependency on any other subsystem.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { CompiledStateGraph } from '@langchain/langgraph';
import type { ModelRole } from '../registry/model-registry';

// ---------------------------------------------------------------------------
// Core definition
// ---------------------------------------------------------------------------

export interface AgentDefinition {
	/** Unique machine-readable identifier, e.g. 'text-continuation' */
	id: string;
	/** Human-readable display name shown in the UI */
	name: string;
	/** Short description of the agent's purpose and behaviour */
	description: string;
	/** Category used for grouping / filtering in the UI */
	category: 'writing' | 'editing' | 'analysis' | 'utility';
	/**
	 * Optional functional role for model selection via ModelRegistry.
	 * When set, the registry's provider/model/temperature for this role
	 * are used as fallbacks.
	 */
	role?: ModelRole;
	/**
	 * Optional LangGraph factory. When present, the agent runs as a full
	 * LangGraph StateGraph instead of a plain chat completion.
	 *
	 * Called once per run with the resolved model (streaming enabled). Returns
	 * a compiled graph whose final node's output is collected as the assistant
	 * response via streamMode: "messages".
	 *
	 * @param model - The resolved LangChain chat model (streaming enabled).
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	buildGraph?: (model: BaseChatModel) => CompiledStateGraph<any, any, any, any, any, any>;
}

// ---------------------------------------------------------------------------
// Serializable snapshot — safe to transmit over Electron IPC
// ---------------------------------------------------------------------------

export interface AgentDefinitionInfo {
	id: string;
	name: string;
	description: string;
	category: AgentDefinition['category'];
	inputHints?: AgentDefinition['inputHints'];
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
	};
}
