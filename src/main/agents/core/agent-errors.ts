export class AgentError extends Error {
	constructor(
		public readonly agentType: string,
		message: string,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'AgentError';
	}
}

export class AgentValidationError extends AgentError {
	constructor(agentType: string, message: string) {
		super(agentType, message);
		this.name = 'AgentValidationError';
	}
}
