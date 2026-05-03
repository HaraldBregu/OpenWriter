import { Client, GatewayIntentBits, Partials } from "discord.js";
import { registerTextHandler } from "./receive";
import { sendChunked } from "./send";
import type { DiscordAdapterOptions } from "./types";
import type {
  ChannelInboundHandler,
  ChannelInboundMessage,
  ChannelOutboundMessage,
  ChannelStatusHandler,
  ChannelStatusUpdate,
} from "../types";

export class DiscordAdapter {
  private client: Client;
  private token: string;
  private allowFrom: Set<string>;
  private handlers = new Set<ChannelInboundHandler>();
  private statusHandlers = new Set<ChannelStatusHandler>();

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
    this.client.on("error", (err) => {
      this.emitStatus({ status: "error", error: String(err) });
    });
    this.client.on("shardDisconnect", () => {
      this.emitStatus({ status: "disconnected" });
    });
  }

  onMessage(handler: ChannelInboundHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onStatus(handler: ChannelStatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private emitStatus(update: ChannelStatusUpdate): void {
    for (const h of this.statusHandlers) h(update);
  }

  async send(msg: ChannelOutboundMessage): Promise<void> {
    await sendChunked(this.client, msg.to, msg.text);
  }

  async start(): Promise<void> {
    this.emitStatus({ status: "connecting" });
    try {
      await this.client.login(this.token);
      this.emitStatus({ status: "connected" });
    } catch (e) {
      this.emitStatus({ status: "error", error: String(e) });
      throw e;
    }
  }

  async stop(): Promise<void> {
    await this.client.destroy();
    this.emitStatus({ status: "disconnected" });
  }
}
