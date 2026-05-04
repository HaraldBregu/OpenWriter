import type { WASocket } from "@whiskeysockets/baileys";

export type WhatsAppMessageEmit = (msg: {
  from: string;
  chatId: string;
  text: string;
}) => void;

function extractText(msg: {
  message?: {
    conversation?: string | null;
    extendedTextMessage?: { text?: string | null } | null;
  } | null;
}): string | null {
  const m = msg.message;
  if (!m) return null;
  return m.conversation || m.extendedTextMessage?.text || null;
}

export function registerTextHandler(
  sock: WASocket,
  emit: WhatsAppMessageEmit,
): void {
  // plain text only — skip status broadcasts, own messages, commands
  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      const senderId = msg.key.remoteJid ?? "";
      if (!senderId || senderId === "status@broadcast") continue;

      const text = extractText(msg);
      if (!text || text.startsWith("/")) continue;

      emit({ from: senderId, chatId: senderId, text });
    }
  });
}
