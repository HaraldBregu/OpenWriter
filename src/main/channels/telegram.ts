import { Bot } from 'grammy';
import type { LoggerService } from '../services/logger';
import type { ChannelAdapter, ChannelDispatch } from './adapter';

const TELEGRAM_MAX_LENGTH = 4096;

export interface TelegramAdapterOptions {
	id: string;
	bot_token: string;
	allow_from: string[];
	dispatch: ChannelDispatch;
	logger: LoggerService;
}

export class TelegramAdapter implements ChannelAdapter {
	readonly id: string;
	readonly type = 'TELEGRAM' as const;

	private readonly bot: Bot;
	private readonly allowFrom: Set<string>;
	private readonly logger: LoggerService;

	constructor(opts: TelegramAdapterOptions) {
		this.id = opts.id;
		this.bot = new Bot(opts.bot_token);
		this.allowFrom = new Set(opts.allow_from.map(String));
		this.logger = opts.logger;

		// plain text only — no commands, photos, stickers, etc.
		this.bot.on('message:text', async (ctx) => {
			const text = ctx.message.text;
			if (!text || text.startsWith('/')) return;

			const senderId = String(ctx.from?.id ?? '');
			if (this.allowFrom.size > 0 && !this.allowFrom.has(senderId)) {
				this.logger.warn(
					'TelegramAdapter',
					`Ignored message from unauthorized user ${senderId}`
				);
				return;
			}

			try {
				const reply = await opts.dispatch(senderId, text);
				if (reply.trim().length > 0) {
					await this.send(String(ctx.chat.id), reply);
				}
			} catch (err) {
				this.logger.error(
					'TelegramAdapter',
					`dispatch failed (chat ${ctx.chat.id})`,
					err
				);
			}
		});
	}

	async send(chatId: string, text: string): Promise<void> {
		let remaining = text;
		while (remaining.length > 0) {
			const chunk = remaining.slice(0, TELEGRAM_MAX_LENGTH);
			remaining = remaining.slice(TELEGRAM_MAX_LENGTH);
			await this.bot.api.sendMessage(chatId, chunk);
		}
	}

	async start(): Promise<void> {
		// start polling without awaiting (start() resolves only on stop)
		this.bot.start({ drop_pending_updates: true }).catch((e) => {
			this.logger.error('TelegramAdapter', 'Telegram polling error', e);
		});
		// give grammy a tick to init
		await new Promise((r) => setTimeout(r, 100));
	}

	async stop(): Promise<void> {
		await this.bot.stop();
	}
}
