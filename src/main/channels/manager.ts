import type { Disposable } from '../core/service-container';
import type { StoreService } from '../store';
import type { LoggerService } from '../services/logger';
import type { AssistantRegistry } from '../assistant';
import { DEFAULT_ASSISTANT_ID } from '../assistant';
import type { Channel } from '../../shared/types';
import type { ChannelAdapter, ChannelDispatch } from './adapter';
import { TelegramAdapter } from './telegram';

/**
 * Owns the lifecycle of all messaging-channel adapters.
 *
 * On `start()` it spawns adapters for every enabled channel persisted in
 * the store. On `upsert(channel)` it stops any running adapter for the
 * same id and (re)spawns it if `enabled === true`. On `remove(id)` it
 * stops and forgets the adapter. `destroy()` is invoked via the
 * Disposable contract during container shutdown.
 *
 * Inbound messages are dispatched to the default Assistant; the Assistant's
 * reply text is sent back through the originating adapter. The dispatch
 * callback decouples adapters from the assistant module.
 */
export class ChannelManager implements Disposable {
	private readonly adapters = new Map<string, ChannelAdapter>();

	constructor(
		private readonly store: StoreService,
		private readonly registry: AssistantRegistry,
		private readonly logger: LoggerService
	) {}

	async start(): Promise<void> {
		for (const ch of this.store.getChannels()) {
			if (ch.enabled) await this.spawn(ch);
		}
		this.logger.info(
			'ChannelManager',
			`Started with ${this.adapters.size} adapter(s)`
		);
	}

	async upsert(ch: Channel): Promise<void> {
		await this.remove(ch.id);
		if (ch.enabled) await this.spawn(ch);
	}

	async remove(id: string): Promise<void> {
		const adapter = this.adapters.get(id);
		if (!adapter) return;
		this.adapters.delete(id);
		try {
			await adapter.stop();
			this.logger.info('ChannelManager', `Stopped adapter "${id}"`);
		} catch (err) {
			this.logger.error('ChannelManager', `Failed to stop "${id}"`, err);
		}
	}

	destroy(): void {
		for (const [id, adapter] of this.adapters) {
			adapter.stop().catch((err) => {
				this.logger.error('ChannelManager', `destroy ${id}`, err);
			});
		}
		this.adapters.clear();
		this.logger.info('ChannelManager', 'Disposed');
	}

	private async spawn(ch: Channel): Promise<void> {
		const dispatch: ChannelDispatch = (_senderId, text) =>
			this.registry.get(DEFAULT_ASSISTANT_ID).send(text);

		let adapter: ChannelAdapter;
		try {
			adapter = this.build(ch, dispatch);
		} catch (err) {
			this.logger.error('ChannelManager', `Failed to build "${ch.id}"`, err);
			return;
		}

		try {
			await adapter.start();
			this.adapters.set(ch.id, adapter);
			this.logger.info(
				'ChannelManager',
				`Started ${ch.type} adapter "${ch.id}"`
			);
		} catch (err) {
			this.logger.error('ChannelManager', `Failed to start "${ch.id}"`, err);
		}
	}

	private build(ch: Channel, dispatch: ChannelDispatch): ChannelAdapter {
		switch (ch.type) {
			case 'TELEGRAM':
				return new TelegramAdapter({
					id: ch.id,
					bot_token: ch.token,
					allow_from: ch.allowFrom,
					dispatch,
					logger: this.logger,
				});
			default:
				throw new Error(`Unsupported channel type: ${ch.type}`);
		}
	}
}
