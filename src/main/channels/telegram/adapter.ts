import { Bot } from "grammy";
import { registerTextHandler } from "./receive";
import { sendChunked } from "./send";
import type { TelegramAdapterOptions } from "./types";
import type {
  ChannelInboundHandler,
  ChannelInboundMessage,
  ChannelOutboundMessage,
} from "../types";

export class TelegramAdapter {
  private bot: Bot;
  private allowFrom: Set<string>;
  private handlers = new Set<ChannelInboundHandler>();

  constructor(opts: TelegramAdapterOptions) {
    this.bot = new Bot(opts.token);
    this.allowFrom = new Set(opts.allowFrom.map(String));
    registerTextHandler(this.bot, this.allowFrom, ({ from, chatId, text }) => {
      const msg: ChannelInboundMessage = { type: "telegram", from, chatId, text };
      for (const h of this.handlers) h(msg);
    });
  }

  onMessage(handler: ChannelInboundHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async send(msg: ChannelOutboundMessage): Promise<void> {
    await sendChunked(this.bot, msg.to, msg.text);
  }

  async start(): Promise<void> {
    // start polling without awaiting (start() resolves only on stop)
    this.bot.start({ drop_pending_updates: true }).catch((e) => {
      console.error("Telegram polling error:", e);
    });
    // give grammy a tick to init
    await new Promise((r) => setTimeout(r, 100));
  }

  async stop(): Promise<void> {
    await this.bot.stop();
  }
}
