import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
  proto,
  useMultiFileAuthState,
  type CacheStore,
  type WAMessageContent,
  type WAMessageKey,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import NodeCache from "@cacheable/node-cache";
import pino from "pino";
import { registerTextHandler } from "./receive";
import { sendChunked } from "./send";
import type { WhatsAppAdapterOptions } from "./types";
import type {
  ChannelInboundHandler,
  ChannelInboundMessage,
  ChannelOutboundMessage,
  ChannelStatusHandler,
  ChannelStatusUpdate,
} from "../types";

function sanitizePhoneNumber(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export class WhatsAppAdapter {
  private authDir: string;
  private phoneNumber: string;
  private sock: WASocket | null = null;
  private stopping = false;
  private pairingRequested = false;
  private handlers = new Set<ChannelInboundHandler>();
  private statusHandlers = new Set<ChannelStatusHandler>();
  private msgRetryCounterCache: CacheStore = new NodeCache() as unknown as CacheStore;
  private logger = pino({ level: "silent" });

  constructor(opts: WhatsAppAdapterOptions) {
    this.authDir = opts.auth_dir;
    this.phoneNumber = sanitizePhoneNumber(opts.phone_number);
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
    if (!this.sock) throw new Error("WhatsApp socket not started");
    await sendChunked(this.sock, msg.to, msg.text);
  }

  async start(): Promise<void> {
    if (!this.phoneNumber) {
      throw new Error("WhatsApp phone number is required for pairing-code login");
    }
    this.stopping = false;
    this.pairingRequested = false;
    this.emitStatus({ status: "connecting" });
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch {
        // ignore
      }
      this.sock = null;
    }
    this.emitStatus({ status: "disconnected" });
  }

  private async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: this.logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, this.logger),
      },
      msgRetryCounterCache: this.msgRetryCounterCache,
      generateHighQualityLinkPreview: true,
      getMessage: this.getMessage,
    });
    this.sock = sock;

    sock.ev.process(async (events) => {
      if (events["creds.update"]) {
        await saveCreds();
      }

      if (events["connection.update"]) {
        const update = events["connection.update"];
        const { connection, lastDisconnect, qr } = update;

        if (qr && !sock.authState.creds.registered && !this.pairingRequested) {
          this.pairingRequested = true;
          try {
            const code = await sock.requestPairingCode(this.phoneNumber);
            this.emitStatus({ status: "pairing_code", pairingCode: code });
          } catch (e) {
            console.error("[WhatsApp] pairing code request failed:", e);
            this.emitStatus({ status: "error", error: String(e) });
          }
        }

        if (connection === "open") {
          this.emitStatus({ status: "connected" });
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
            ?.statusCode;
          const loggedOut = statusCode === DisconnectReason.loggedOut;
          if (loggedOut || this.stopping) {
            this.emitStatus({ status: "disconnected" });
          } else {
            this.emitStatus({ status: "connecting" });
            this.connect().catch((e) => {
              console.error("[WhatsApp] reconnect failed:", e);
              this.emitStatus({ status: "error", error: String(e) });
            });
          }
        }
      }
    });

    registerTextHandler(sock, ({ from, chatId, text }) => {
      const msg: ChannelInboundMessage = { type: "whatsapp", from, chatId, text };
      for (const h of this.handlers) h(msg);
    });
  }

  private getMessage = async (
    _key: WAMessageKey,
  ): Promise<WAMessageContent | undefined> => {
    return proto.Message.create({ conversation: "" });
  };
}
