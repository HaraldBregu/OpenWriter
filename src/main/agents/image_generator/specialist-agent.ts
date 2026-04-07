import OpenAI from 'openai';

export interface ImageGeneratorSpecialistAgent {
	readonly client: OpenAI;
	readonly systemPrompt: string;
	readonly model: string;
	readonly temperature: number;
	readonly maxTokens: number;
}

export function createImageGeneratorSpecialistAgent(
	client: OpenAI,
	systemPrompt: string,
	model: string,
	temperature: number,
	maxTokens: number
): ImageGeneratorSpecialistAgent {
	return { client, systemPrompt, model, temperature, maxTokens };
}

export async function invokeImageGeneratorSpecialist(
	agent: ImageGeneratorSpecialistAgent,
	userMessage: string
): Promise<string> {
	const response = await agent.client.chat.completions.create({
		model: agent.model,
		temperature: agent.temperature,
		max_tokens: agent.maxTokens,
		messages: [
			{ role: 'system', content: agent.systemPrompt },
			{ role: 'user', content: userMessage },
		],
	});

	return (response.choices[0]?.message?.content ?? '').trim();
}
