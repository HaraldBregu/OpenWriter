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
} from "../types";

export class WhatsAppAdapter {
  private authDir: string;
  private allowFrom: Set<string>;
  private sock: WASocket | null = null;
  private stopping = false;
  private handlers = new Set<ChannelInboundHandler>();

  constructor(opts: WhatsAppAdapterOptions) {
    this.authDir = opts.auth_dir;
    this.allowFrom = new Set(opts.allow_from.map(String));
  }

  onMessage(handler: ChannelInboundHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async send(msg: ChannelOutboundMessage): Promise<void> {
    if (!this.sock) throw new Error("WhatsApp socket not started");
    await sendChunked(this.sock, msg.to, msg.text);
  }

  async start(): Promise<void> {
    this.stopping = false;
    await this.connect();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.sock) {
      await this.sock.logout().catch(() => undefined);
      this.sock = null;
    }
  }

  private async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    const sock = makeWASocket({ auth: state });
    this.sock = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log("[WhatsApp] scan QR code (raw):", qr);
      }
      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
          ?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        if (!loggedOut && !this.stopping) {
          this.connect().catch((e) =>
            console.error("[WhatsApp] reconnect failed:", e),
          );
        }
      }
    });

    registerTextHandler(sock, this.allowFrom, ({ from, chatId, text }) => {
      const msg: ChannelInboundMessage = { type: "whatsapp", from, chatId, text };
      for (const h of this.handlers) h(msg);
    });
  }
}
