/**
 * AgentDefinition — describes a named, pre-configured agent.
 *
 * This module is intentionally self-contained: agent definitions are generic
 * components with no dependency on any other subsystem.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { CompiledStateGraph } from '@langchain/langgraph';

// ---------------------------------------------------------------------------
// Per-node model types
// ---------------------------------------------------------------------------

/** Model configuration for a single node — plain value object. */
export interface NodeModelConfig {
	providerId: string;
	modelId: string;
	temperature: number;
	maxTokens?: number;
}

/** Maps node names to resolved LangChain chat model instances. */
export type NodeModelMap = Record<string, BaseChatModel>;

// ---------------------------------------------------------------------------
// Graph input context
// ---------------------------------------------------------------------------

/**
 * All executor-resolved context that a graph's `buildGraphInput` hook may use
 * when constructing the graph's initial state.
 *
 * Agents with a custom state shape (i.e. not `{ messages }`) use this context
 * to populate their domain-specific input fields, including the API key and
 * model name so nodes do not need to hardcode provider details.
 */
export interface GraphInputContext {
	/** The user-facing prompt / raw input text sent by the caller. */
	prompt: string;
	/** Resolved API key for the agent's provider. */
	apiKey: string;
	/** Resolved model name (e.g. 'gpt-4o'). */
	modelName: string;
	/** Resolved provider identifier (e.g. 'openai'). */
	providerId: string;
	/** Effective sampling temperature for this run. */
	temperature: number;
}

// ---------------------------------------------------------------------------
// Core definition
// ---------------------------------------------------------------------------

export interface AgentDefinition {
	/** Unique machine-readable identifier, e.g. 'writing-assistant' */
	id: string;
	/** Human-readable display name shown in the UI */
	name: string;
	/** Category used for grouping / filtering in the UI */
	category: 'writing' | 'editing' | 'analysis' | 'utility';
	/**
	 * Default model config for the single-model path.
	 * Used when the agent has no per-node configs and no per-request override.
	 */
	defaultModel?: NodeModelConfig;
	/**
	 * Per-node model configs for multi-model graphs.
	 * When present, the handler resolves a separate model for each node
	 * and passes a `NodeModelMap` to `buildGraph` instead of a single model.
	 */
	nodeModels?: Record<string, NodeModelConfig>;
	/**
	 * Optional LangGraph factory. When present, the agent runs as a full
	 * LangGraph StateGraph instead of a plain chat completion.
	 *
	 * Two execution contracts are supported depending on whether the companion
	 * hooks `buildGraphInput` and `extractGraphOutput` are also provided:
	 *
	 * **Messages protocol** (default — no companion hooks):
	 *   The executor passes `{ messages: [SystemMessage, ...history, HumanMessage] }`
	 *   as initial state and streams tokens via `streamMode: 'messages'`.
	 *   Use this for graphs whose state includes a `messages` channel.
	 *
	 * **Custom state protocol** (companion hooks required):
	 *   The executor calls `buildGraphInput(ctx)` to construct the initial state,
	 *   runs the graph to completion with `streamMode: 'values'`, then calls
	 *   `extractGraphOutput(finalState)` to pull the content string.
	 *   Use this for graphs with domain-specific state shapes (e.g. WriterState).
	 *
	 * @param models - A single resolved LangChain chat model, or a `NodeModelMap`
	 *                 keyed by node name when the definition declares `nodeModels`.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	buildGraph?: (
		models: BaseChatModel | NodeModelMap
	) => CompiledStateGraph<any, any, any, any, any, any>;
	/**
	 * Maps executor-resolved context to the graph's initial state object.
	 *
	 * Required when the graph uses a custom state shape (not `{ messages }`).
	 * Must be provided together with `extractGraphOutput`; the executor treats
	 * both hooks as a pair and will use the custom-state path only when both
	 * are present.
	 */
	buildGraphInput?: (ctx: GraphInputContext) => Record<string, unknown>;
	/**
	 * Extracts the text content string from the graph's final state snapshot.
	 *
	 * Called once after the graph run completes. Should return the primary
	 * content field (e.g. `state.completion` for WriterState).
	 *
	 * Required when `buildGraphInput` is provided.
	 */
	extractGraphOutput?: (state: Record<string, unknown>) => string;
}

// ---------------------------------------------------------------------------
// Serializable snapshot — safe to transmit over Electron IPC
// ---------------------------------------------------------------------------

export interface AgentDefinitionInfo {
	id: string;
	name: string;
	category: AgentDefinition['category'];
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
		category: def.category,
	};
}
