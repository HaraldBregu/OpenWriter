import type { Bot } from "grammy";
import { TELEGRAM_MAX_LENGTH } from "./constants";

export async function sendChunked(
  bot: Bot,
  chatId: string,
  text: string,
): Promise<void> {
  let remaining = text;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, TELEGRAM_MAX_LENGTH);
    remaining = remaining.slice(TELEGRAM_MAX_LENGTH);
    await bot.api.sendMessage(chatId, chunk);
  }
}
