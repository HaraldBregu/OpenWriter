export const ASSISTANT_STATE_MESSAGES = {
	ROUTE_QUESTION: 'Routing question...',
	RETRIEVE_DOCUMENTS: 'Retrieving documents...',
	GRADE_DOCUMENTS: 'Grading retrieved documents...',
	REWRITE_QUERY: 'Rewriting query...',
	GENERATE_DIRECT_ANSWER: 'Generating direct answer...',
	GENERATE_ANSWER: 'Generating answer from retrieved documents...',
	RETURN_FALLBACK_RESPONSE: 'Preparing fallback response...',
} as const;
