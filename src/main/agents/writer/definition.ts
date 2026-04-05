import type { AgentDefinition } from '../core/definition';
import { executeWriterAgent } from './workflow';

const definition: AgentDefinition = {
	id: 'writer',
	name: 'Writer',
	category: 'writing',
	defaultModel: {
		providerId: 'openai',
		modelId: 'gpt-4o-mini',
		temperature: 0.7,
		maxTokens: 3072,
	},
	execute: executeWriterAgent,
};

export { definition as WriterAgent };
