import { app } from 'electron';
import path from 'node:path';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import type { Channel, ChannelStatusEvent, ChannelType } from '../../shared/types';
import { AppChannels } from '../../shared/channels';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import type { EventBus } from '../core/event-bus';
import { AssistantRegistry, DEFAULT_ASSISTANT_ID } from '../assistant';
import { TelegramAdapter } from './telegram';
import { WhatsAppAdapter } from './whatsapp';
import { DiscordAdapter } from './discord';
import { panel } from './panel';

marked.use(markedTerminal() as Parameters<typeof marked.use>[0]);
import type {
	ChannelAdapter,
	ChannelAdapterFactory,
	ChannelInboundMessage,
	ChannelOutboundMessage,
	ChannelStatusUpdate,
} from './types';

export class ChannelRegistry {
	private adapters = new Map<ChannelType, ChannelAdapter>();
	private factories: Record<ChannelType, ChannelAdapterFactory>;
	private statusCache = new Map<ChannelType, ChannelStatusEvent>();

	constructor(
		private store: StoreService,
		private logger: LoggerService,
		private eventBus: EventBus,
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
						ch.whatsapp.phoneNumber || 'default'
					),
					phone_number: ch.whatsapp.phoneNumber,
				}),
			discord: (ch) =>
				new DiscordAdapter({
					token: ch.discord.token,
					allowFrom: ch.discord.allowFrom,
				}),
		};
	}

	async startAll(): Promise<void> {
		const channel = this.store.getChannel();
		if (!channel) return;
		for (const type of Object.keys(this.factories) as ChannelType[]) {
			if (type === 'whatsapp') continue;
			await this.start(type, channel);
		}
	}

	async start(type: ChannelType, channel: Channel): Promise<void> {
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
			adapter.onStatus((update) => this.handleStatus(type, update));
			await adapter.start();
			this.adapters.set(type, adapter);
			this.logger.info('ChannelRegistry', `Started ${type} channel`);
		} catch (err) {
			this.logger.error('ChannelRegistry', `Failed to start ${type} channel`, err);
			this.handleStatus(type, { status: 'error', error: String(err) });
		}
	}

	async restart(type: ChannelType): Promise<void> {
		const existing = this.adapters.get(type);
		if (existing) {
			try {
				await existing.stop();
			} catch (err) {
				this.logger.error('ChannelRegistry', `Failed to stop ${type} during restart`, err);
			}
			this.adapters.delete(type);
		}
		const channel = this.store.getChannel();
		if (!channel) return;
		await this.start(type, channel);
	}

	getStatus(): Partial<Record<ChannelType, ChannelStatusEvent>> {
		const out: Partial<Record<ChannelType, ChannelStatusEvent>> = {};
		for (const [type, evt] of this.statusCache) out[type] = evt;
		return out;
	}

	async send(msg: ChannelOutboundMessage): Promise<void> {
		const adapter = this.adapters.get(msg.type);
		if (!adapter) {
			throw new Error(`No active adapter for channel type: ${msg.type}`);
		}
		await adapter.send(msg);
	}

	private handleStatus(type: ChannelType, update: ChannelStatusUpdate): void {
		const event: ChannelStatusEvent = {
			type,
			status: update.status,
			qrDataUrl: update.qrDataUrl,
			error: update.error,
			timestamp: Date.now(),
		};
		this.statusCache.set(type, event);
		this.eventBus.broadcast(AppChannels.channelStatusChanged, event);
	}

	private async handleMessage(msg: ChannelInboundMessage): Promise<void> {
		console.log('[ChannelRegistry] message received', msg);
		try {
			const assistant = this.assistantRegistry.get(DEFAULT_ASSISTANT_ID);
			const reply = await assistant.send(msg.text);
			const rendered = (await marked.parse(reply)).toString().trimEnd();
			console.log(panel('assistant', rendered, 'green'));
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

	get(type: ChannelType): ChannelAdapter | undefined {
		return this.adapters.get(type);
	}

	destroy(): void {
		void this.stopAll();
	}
}
