/**
 * Minimal CJS-compatible chokidar mock.
 *
 * chokidar v5 is pure ESM; importing it from ts-jest's CommonJS pipeline
 * fails with `Cannot use import statement outside a module`. Tests that rely
 * on the real watcher should opt-out of this mock with their own jest.mock.
 */
type Listener = (...args: unknown[]) => void;

class FakeWatcher {
	private readonly listeners = new Map<string, Listener[]>();

	on(event: string, listener: Listener): this {
		const list = this.listeners.get(event) ?? [];
		list.push(listener);
		this.listeners.set(event, list);
		return this;
	}

	off(event: string, listener: Listener): this {
		const list = this.listeners.get(event);
		if (!list) return this;
		this.listeners.set(
			event,
			list.filter((l) => l !== listener)
		);
		return this;
	}

	add(): this {
		return this;
	}

	unwatch(): this {
		return this;
	}

	async close(): Promise<void> {
		this.listeners.clear();
	}
}

export function watch(): FakeWatcher {
	return new FakeWatcher();
}

export default { watch };
