import { app } from 'electron';
import path from 'node:path';
import type { Channel } from '../../shared/types';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import { TelegramAdapter } from './telegram';
import { WhatsAppAdapter } from './whatsapp';
import type { ChannelAdapter, ChannelAdapterFactory } from './types';

export class ChannelRegistry {
	private adapters = new Map<keyof Channel, ChannelAdapter>();
	private factories: Record<keyof Channel, ChannelAdapterFactory>;

	constructor(
		private store: StoreService,
		private logger: LoggerService
	) {
		this.factories = {
			telegram: (ch) =>
				new TelegramAdapter({
					token: ch.telegram.token,
					allowFrom: ch.telegram.allowFrom,
				}),
			whatsapp: (ch) =>
				new WhatsAppAdapter({
					auth_dir: path.join(
						app.getPath('userData'),
						'channels',
						'whatsapp',
						ch.whatsapp.token || 'default'
					),
					allow_from: ch.whatsapp.allowFrom,
				}),
		};
	}

	async startAll(): Promise<void> {
		const channel = this.store.getChannel();
		if (!channel) return;
		for (const type of Object.keys(this.factories) as (keyof Channel)[]) {
			await this.start(type, channel);
		}
	}

	async start(type: keyof Channel, channel: Channel): Promise<void> {
		if (this.adapters.has(type)) return;

		const factory = this.factories[type];
		if (!factory) {
			this.logger.warn('ChannelRegistry', `Unknown channel type: ${type}`);
			return;
		}

		try {
			const adapter = factory(channel);
			await adapter.start();
			this.adapters.set(type, adapter);
			this.logger.info('ChannelRegistry', `Started ${type} channel`);
		} catch (err) {
			this.logger.error('ChannelRegistry', `Failed to start ${type} channel`, err);
		}
	}

	async stopAll(): Promise<void> {
		for (const [type, adapter] of this.adapters) {
			try {
				await adapter.stop();
			} catch (err) {
				this.logger.error('ChannelRegistry', `Failed to stop ${type}`, err);
			}
		}
		this.adapters.clear();
	}

	get(type: keyof Channel): ChannelAdapter | undefined {
		return this.adapters.get(type);
	}

	destroy(): void {
		void this.stopAll();
	}
}
