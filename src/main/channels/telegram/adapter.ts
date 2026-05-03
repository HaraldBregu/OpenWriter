import { Bot } from "grammy";
import { registerTextHandler } from "./receive";
import { sendChunked } from "./send";
import type { TelegramAdapterOptions } from "./types";
import type { ChannelMessage, ChannelMessageHandler } from "../types";

export class TelegramAdapter {
  private bot: Bot;
  private allowFrom: Set<string>;
  private handlers = new Set<ChannelMessageHandler>();

  constructor(opts: TelegramAdapterOptions) {
    this.bot = new Bot(opts.token);
    this.allowFrom = new Set(opts.allowFrom.map(String));
    registerTextHandler(this.bot, this.allowFrom, ({ from, chatId, text }) => {
      const msg: ChannelMessage = { type: "TELEGRAM", from, chatId, text };
      for (const h of this.handlers) h(msg);
    });
  }

  onMessage(handler: ChannelMessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async send(chatId: string, text: string): Promise<void> {
    await sendChunked(this.bot, chatId, text);
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
