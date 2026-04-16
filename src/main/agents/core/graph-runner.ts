/**
 * Graph Runner — minimal state-graph executor.
 *
 * Provides StateGraph, CompiledGraph, START and END constants with an
 * API surface compatible with the existing assistant and painter graphs.
 *
 * The compiled graph's `stream()` method yields `[mode, data]` tuples:
 *   - `['messages', [{ content: token }, { graph_node: nodeName }]]`
 *   - `['values', state]`
 *
 * Token interception works through `ChatModel._tokenListener`: the graph
 * runner wires it before each node so tokens emitted by `model.stream()`
 * are forwarded in real-time.
 */

import type { ChatModel } from '../../shared/ai-types';

export const START = '__start__';
export const END = '__end__';

// ---------------------------------------------------------------------------
// Token channel — async queue used for real-time token forwarding
// ---------------------------------------------------------------------------

class TokenChannel<T> {
	private buffer: T[] = [];
	private waiter: { resolve: (v: IteratorResult<T>) => void; reject: (e: Error) => void } | null =
		null;
	private finished = false;
	private _error: Error | null = null;

	push(value: T): void {
		if (this.finished) return;
		if (this.waiter) {
			const { resolve } = this.waiter;
			this.waiter = null;
			resolve({ value, done: false });
		} else {
			this.buffer.push(value);
		}
	}

	close(): void {
		this.finished = true;
		if (this.waiter) {
			const { resolve } = this.waiter;
			this.waiter = null;
			resolve({ value: undefined as unknown as T, done: true });
		}
	}

	error(err: Error): void {
		this._error = err;
		this.finished = true;
		if (this.waiter) {
			const { reject } = this.waiter;
			this.waiter = null;
			reject(err);
		}
	}

	[Symbol.asyncIterator](): AsyncIterator<T> {
		return {
			next: (): Promise<IteratorResult<T>> => {
				if (this._error) return Promise.reject(this._error);
				if (this.buffer.length > 0) {
					return Promise.resolve({ value: this.buffer.shift()!, done: false });
				}
				if (this.finished) {
					return Promise.resolve({ value: undefined as unknown as T, done: true });
				}
				return new Promise<IteratorResult<T>>((resolve, reject) => {
					this.waiter = { resolve, reject };
				});
			},
		};
	}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NodeFunction<S> = (state: S) => Promise<Partial<S>>;

interface EdgeConfig<S> {
	type: 'static' | 'conditional';
	target?: string;
	condition?: (state: S) => string;
}

export interface GraphStreamOptions {
	signal?: AbortSignal;
	chatModels?: ChatModel[];
}

// ---------------------------------------------------------------------------
// StateGraph builder
// ---------------------------------------------------------------------------

export class StateGraph<S extends Record<string, unknown>> {
	private _nodes = new Map<string, NodeFunction<S>>();
	private _edges = new Map<string, EdgeConfig<S>>();

	addNode(name: string, fn: NodeFunction<S>): this {
		this._nodes.set(name, fn);
		return this;
	}

	addEdge(from: string, to: string): this {
		this._edges.set(from, { type: 'static', target: to });
		return this;
	}

	addConditionalEdges(from: string, condition: (state: S) => string, _targets: string[]): this {
		this._edges.set(from, { type: 'conditional', condition });
		return this;
	}

	compile(): CompiledGraph<S> {
		return new CompiledGraph(new Map(this._nodes), new Map(this._edges));
	}
}

// ---------------------------------------------------------------------------
// CompiledGraph executor
// ---------------------------------------------------------------------------

export class CompiledGraph<S extends Record<string, unknown>> {
	constructor(
		private readonly nodes: Map<string, NodeFunction<S>>,
		private readonly edges: Map<string, EdgeConfig<S>>
	) {}

	async *stream(
		initialState: S,
		options?: GraphStreamOptions
	): AsyncGenerator<[string, unknown]> {
		const chatModels = options?.chatModels ?? [];
		const signal = options?.signal;
		let state = { ...initialState };
		let current = this.resolveNext(START, state);

		while (current && current !== END) {
			if (signal?.aborted) break;

			const nodeName = current;
			const nodeFn = this.nodes.get(nodeName);
			if (!nodeFn) {
				throw new Error(`Graph node "${nodeName}" not found`);
			}

			const channel = new TokenChannel<[string, unknown]>();

			for (const model of chatModels) {
				model._tokenListener = (token: string) => {
					channel.push([
						'messages',
						[{ content: token }, { graph_node: nodeName }],
					]);
				};
			}

			const nodePromise = nodeFn(state)
				.then((update) => {
					state = { ...state, ...update };
					channel.close();
				})
				.catch((err: unknown) => {
					channel.error(err instanceof Error ? err : new Error(String(err)));
				});

			for await (const event of channel) {
				yield event;
			}

			await nodePromise;

			for (const model of chatModels) {
				model._tokenListener = null;
			}

			yield ['values', state];

			current = this.resolveNext(nodeName, state);
		}
	}

	private resolveNext(from: string, state: S): string | null {
		const edge = this.edges.get(from);
		if (!edge) return null;

		if (edge.type === 'static') {
			return edge.target ?? null;
		}

		if (edge.type === 'conditional' && edge.condition) {
			return edge.condition(state);
		}

		return null;
	}
}
