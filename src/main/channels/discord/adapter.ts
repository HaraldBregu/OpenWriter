import { Client, GatewayIntentBits, Partials } from "discord.js";
import { registerTextHandler } from "./receive";
import { sendChunked } from "./send";
import type { DiscordAdapterOptions } from "./types";
import type {
  ChannelInboundHandler,
  ChannelInboundMessage,
  ChannelOutboundMessage,
} from "../types";

export class DiscordAdapter {
  private client: Client;
  private token: string;
  private allowFrom: Set<string>;
  private handlers = new Set<ChannelInboundHandler>();

  constructor(opts: DiscordAdapterOptions) {
    this.token = opts.token;
    this.allowFrom = new Set(opts.allowFrom.map(String));
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message],
    });
    registerTextHandler(this.client, this.allowFrom, ({ from, chatId, text }) => {
      const msg: ChannelInboundMessage = { type: "discord", from, chatId, text };
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
    await sendChunked(this.client, msg.to, msg.text);
  }

  async start(): Promise<void> {
    await this.client.login(this.token);
  }

  async stop(): Promise<void> {
    await this.client.destroy();
  }
}
