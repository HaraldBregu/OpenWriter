import type { WASocket } from "@whiskeysockets/baileys";
import { WHATSAPP_MAX_LENGTH } from "./constants";

export async function sendChunked(
  sock: WASocket,
  jid: string,
  text: string,
): Promise<void> {
  let remaining = text;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, WHATSAPP_MAX_LENGTH);
    remaining = remaining.slice(WHATSAPP_MAX_LENGTH);
    await sock.sendMessage(jid, { text: chunk });
  }
}
