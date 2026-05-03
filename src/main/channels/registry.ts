import { app } from 'electron';
import path from 'node:path';
import type { Channel } from '../../shared/types';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import { AssistantRegistry, DEFAULT_ASSISTANT_ID } from '../assistant';
import { TelegramAdapter } from './telegram';
import { WhatsAppAdapter } from './whatsapp';
import type {
	ChannelAdapter,
	ChannelAdapterFactory,
	ChannelInboundMessage,
	ChannelMessageType,
	ChannelOutboundMessage,
} from './types';

export class ChannelRegistry {
	private adapters = new Map<ChannelMessageType, ChannelAdapter>();
	private factories: Record<ChannelMessageType, ChannelAdapterFactory>;

	constructor(
		private store: StoreService,
		private logger: LoggerService,
		private assistantRegistry: AssistantRegistry
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
		for (const type of Object.keys(this.factories) as ChannelMessageType[]) {
			await this.start(type, channel);
		}
	}

	async start(type: ChannelMessageType, channel: Channel): Promise<void> {
		if (this.adapters.has(type)) return;

		const factory = this.factories[type];
		if (!factory) {
			this.logger.warn('ChannelRegistry', `Unknown channel type: ${type}`);
			return;
		}

		try {
			const adapter = factory(channel);
			adapter.onMessage((msg) => {
				void this.handleMessage(msg);
			});
			await adapter.start();
			this.adapters.set(type, adapter);
			this.logger.info('ChannelRegistry', `Started ${type} channel`);
		} catch (err) {
			this.logger.error('ChannelRegistry', `Failed to start ${type} channel`, err);
		}
	}

	async send(msg: ChannelOutboundMessage): Promise<void> {
		const adapter = this.adapters.get(msg.type);
		if (!adapter) {
			throw new Error(`No active adapter for channel type: ${msg.type}`);
		}
		await adapter.send(msg);
	}

	private async handleMessage(msg: ChannelInboundMessage): Promise<void> {
		console.log('[ChannelRegistry] message received', msg);
		try {
			const assistant = this.assistantRegistry.get(DEFAULT_ASSISTANT_ID);
			const reply = await assistant.send(msg.text);
			await this.send({ type: msg.type, to: msg.chatId, text: reply });
		} catch (err) {
			this.logger.error('ChannelRegistry', `Assistant failed for ${msg.type}`, err);
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

	get(type: ChannelMessageType): ChannelAdapter | undefined {
		return this.adapters.get(type);
	}

	destroy(): void {
		void this.stopAll();
	}
}
