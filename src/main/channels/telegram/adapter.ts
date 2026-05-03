import { Bot, GrammyError, HttpError } from "grammy";
import { registerTextHandler } from "./receive";
import { sendChunked } from "./send";
import type { TelegramAdapterOptions } from "./types";
import type {
  ChannelInboundHandler,
  ChannelInboundMessage,
  ChannelOutboundMessage,
  ChannelStatusHandler,
  ChannelStatusUpdate,
} from "../types";

const HEALTH_CHECK_INTERVAL_MS = 60_000;
const RECONNECT_INITIAL_DELAY_MS = 2_000;
const RECONNECT_MAX_DELAY_MS = 60_000;

export class TelegramAdapter {
  private bot: Bot;
  private token: string;
  private allowFrom: Set<string>;
  private handlers = new Set<ChannelInboundHandler>();
  private statusHandlers = new Set<ChannelStatusHandler>();
  private healthTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelayMs = RECONNECT_INITIAL_DELAY_MS;
  private stopping = false;

  constructor(opts: TelegramAdapterOptions) {
    this.token = opts.token;
    this.allowFrom = new Set(opts.allowFrom.map(String));
    this.bot = this.createBot();
  }

  private createBot(): Bot {
    const bot = new Bot(this.token);
    registerTextHandler(bot, this.allowFrom, ({ from, chatId, text }) => {
      const msg: ChannelInboundMessage = { type: "telegram", from, chatId, text };
      for (const h of this.handlers) h(msg);
    });
    bot.catch((err) => {
      const reason = err.error instanceof Error ? err.error.message : String(err.error);
      console.error("[telegram] handler error:", reason);
      this.emitStatus({ status: "error", error: reason });
    });
    return bot;
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
    await sendChunked(this.bot, msg.to, msg.text);
  }

  async start(): Promise<void> {
    this.stopping = false;
    this.reconnectDelayMs = RECONNECT_INITIAL_DELAY_MS;
    this.emitStatus({ status: "connecting" });

    this.bot.start({ drop_pending_updates: true }).catch((e) => {
      console.error("[telegram] polling stopped:", e);
      this.emitStatus({ status: "error", error: String(e) });
      this.scheduleReconnect();
    });

    await new Promise((r) => setTimeout(r, 100));
    this.emitStatus({ status: "connected" });
    this.startHealthCheck();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.clearTimers();
    try {
      await this.bot.stop();
    } catch (e) {
      console.error("[telegram] stop failed:", e);
    }
    this.emitStatus({ status: "disconnected" });
  }

  private startHealthCheck(): void {
    this.clearHealthCheck();
    this.healthTimer = setInterval(() => {
      void this.runHealthCheck();
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private async runHealthCheck(): Promise<void> {
    if (this.stopping) return;
    try {
      await this.bot.api.getMe();
      this.reconnectDelayMs = RECONNECT_INITIAL_DELAY_MS;
    } catch (e) {
      const reason =
        e instanceof GrammyError
          ? `GrammyError ${e.error_code}: ${e.description}`
          : e instanceof HttpError
            ? `HttpError: ${e.message}`
            : String(e);
      console.error("[telegram] health check failed:", reason);
      this.emitStatus({ status: "error", error: reason });
      await this.forceReconnect();
    }
  }

  private async forceReconnect(): Promise<void> {
    this.clearHealthCheck();
    try {
      await this.bot.stop();
    } catch {
      // ignore — bot may already be down
    }
    this.bot = this.createBot();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) return;
    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS);
    this.emitStatus({ status: "connecting" });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start().catch((e) => {
        console.error("[telegram] reconnect failed:", e);
        this.emitStatus({ status: "error", error: String(e) });
        this.scheduleReconnect();
      });
    }, delay);
  }

  private clearHealthCheck(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHealthCheck();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
