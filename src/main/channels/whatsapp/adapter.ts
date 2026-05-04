import {
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
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
  private handlers = new Set<ChannelInboundHandler>();
  private statusHandlers = new Set<ChannelStatusHandler>();

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
    this.emitStatus({ status: "connecting" });
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.sock) {
      await this.sock.logout().catch(() => undefined);
      this.sock = null;
    }
    this.emitStatus({ status: "disconnected" });
  }

  private async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    const sock = makeWASocket({ auth: state, printQRInTerminal: false });
    this.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
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
    });

    if (!sock.authState.creds.registered) {
      try {
        const code = await sock.requestPairingCode(this.phoneNumber);
        this.emitStatus({ status: "pairing_code", pairingCode: code });
      } catch (e) {
        console.error("[WhatsApp] pairing code request failed:", e);
        this.emitStatus({ status: "error", error: String(e) });
      }
    }

    registerTextHandler(sock, ({ from, chatId, text }) => {
      const msg: ChannelInboundMessage = { type: "whatsapp", from, chatId, text };
      for (const h of this.handlers) h(msg);
    });
  }
}
