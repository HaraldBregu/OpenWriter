import { app } from 'electron';
import path from 'node:path';
import type { Channel, ChannelType } from '../../shared/types';
import type { LoggerService } from '../logger';
import { TelegramAdapter } from './telegram';
import { WhatsAppAdapter } from './whatsapp';
import type { ChannelAdapter, ChannelAdapterFactory } from './types';

export class ChannelRegistry {
	private adapters = new Map<string, ChannelAdapter>();
	private factories: Record<ChannelType, ChannelAdapterFactory>;

	constructor(private logger: LoggerService) {
		this.factories = {
			TELEGRAM: (ch) =>
				new TelegramAdapter({
					bot_token: ch.token,
					allow_from: ch.allowFrom,
				}),
			WHATSAPP: (ch) =>
				new WhatsAppAdapter({
					auth_dir: path.join(
						app.getPath('userData'),
						'channels',
						'whatsapp',
						ch.token || 'default'
					),
					allow_from: ch.allowFrom,
				}),
		};
	}

	async startAll(channels: Channel[]): Promise<void> {
		for (const ch of channels) {
			await this.start(ch);
		}
	}

	async start(channel: Channel): Promise<void> {
		const key = this.keyFor(channel);
		if (this.adapters.has(key)) return;

		const factory = this.factories[channel.type];
		if (!factory) {
			this.logger.warn('ChannelRegistry', `Unknown channel type: ${channel.type}`);
			return;
		}

		try {
			const adapter = factory(channel);
			await adapter.start();
			this.adapters.set(key, adapter);
			this.logger.info('ChannelRegistry', `Started ${channel.type} channel`);
		} catch (err) {
			this.logger.error('ChannelRegistry', `Failed to start ${channel.type} channel`, err);
		}
	}

	async stopAll(): Promise<void> {
		for (const [key, adapter] of this.adapters) {
			try {
				await adapter.stop();
			} catch (err) {
				this.logger.error('ChannelRegistry', `Failed to stop ${key}`, err);
			}
		}
		this.adapters.clear();
	}

	get(channel: Channel): ChannelAdapter | undefined {
		return this.adapters.get(this.keyFor(channel));
	}

	destroy(): void {
		void this.stopAll();
	}

	private keyFor(ch: Channel): string {
		return `${ch.type}:${ch.token}`;
	}
}
