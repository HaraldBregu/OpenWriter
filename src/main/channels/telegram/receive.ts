import type { Bot } from "grammy";

export function registerTextHandler(bot: Bot, allowFrom: Set<string>): void {
  // plain text only — no commands, photos, stickers, etc.
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text;
    if (!text || text.startsWith("/")) return;

    const senderId = String(ctx.from?.id ?? "");
    if (allowFrom.size > 0 && !allowFrom.has(senderId)) {
      console.warn(`Ignored message from unauthorized user ${senderId}`);
      return;
    }
  });
}
