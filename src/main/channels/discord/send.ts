import type { Client, TextBasedChannel } from "discord.js";
import { DISCORD_MAX_LENGTH } from "./constants";

export async function sendChunked(
  client: Client,
  chatId: string,
  text: string,
): Promise<void> {
  const channel = await client.channels.fetch(chatId);
  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    throw new Error(`Discord channel ${chatId} is not text-based`);
  }
  const sendable = channel as TextBasedChannel & { send: (text: string) => Promise<unknown> };
  let remaining = text;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, DISCORD_MAX_LENGTH);
    remaining = remaining.slice(DISCORD_MAX_LENGTH);
    await sendable.send(chunk);
  }
}
