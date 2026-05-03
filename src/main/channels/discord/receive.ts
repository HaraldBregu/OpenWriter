import type { Client, Message } from "discord.js";

export type DiscordMessageEmit = (msg: {
  from: string;
  chatId: string;
  text: string;
}) => void;

export function registerTextHandler(
  client: Client,
  allowFrom: Set<string>,
  emit: DiscordMessageEmit,
): void {
  client.on("messageCreate", (msg: Message) => {
    if (msg.author.bot) return;
    const text = msg.content;
    if (!text || text.startsWith("/")) return;

    const senderId = msg.author.id;
    if (allowFrom.size > 0 && !allowFrom.has(senderId)) {
      console.warn(`Ignored message from unauthorized user ${senderId}`);
      return;
    }

    const isDM = !msg.guildId;
    const botId = client.user?.id;
    if (!isDM && botId && !msg.mentions.users.has(botId)) return;

    emit({ from: senderId, chatId: msg.channelId, text });
  });
}
