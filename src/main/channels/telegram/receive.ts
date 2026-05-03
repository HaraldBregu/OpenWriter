import type { Bot } from "grammy";

export type TelegramMessageEmit = (msg: {
  from: string;
  chatId: string;
  text: string;
}) => void;

export function registerTextHandler(
  bot: Bot,
  allowFrom: Set<string>,
  emit: TelegramMessageEmit,
): void {
  // plain text only — no commands, photos, stickers, etc.
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (!text || text.startsWith("/")) return;

    const senderId = String(ctx.from?.id ?? "");
    if (allowFrom.size > 0 && !allowFrom.has(senderId)) {
      console.warn(`Ignored message from unauthorized user ${senderId}`);
      return;
    }

    emit({ from: senderId, chatId: String(ctx.chat.id), text });
  });
}
