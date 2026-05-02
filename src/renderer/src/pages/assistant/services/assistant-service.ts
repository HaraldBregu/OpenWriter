export interface AssistantReply {
	readonly content: string;
}

export async function sendMessage(prompt: string): Promise<AssistantReply> {
	return { content: `Echo: ${prompt}` };
}
