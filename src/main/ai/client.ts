import OpenAI from 'openai';

export function createAIClient(apiKey: string): OpenAI {
  if (!apiKey.trim()) {
    throw new Error('API key must not be empty');
  }

  return new OpenAI({ apiKey });
}
