/**
 * Evaluate node for the Researcher agent.
 *
 * Receives the classified intent from the understand node and determines the
 * optimal response strategy for the query. The strategy captures whether the
 * request actually needs explicit research, the appropriate answer length, and
 * the best response style for the user's intent.
 *
 * This is a non-streamed invoke call. The resulting strategy string is
 * injected into the context of all downstream nodes (plan, research, compose)
 * so they can tailor their output accordingly.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ResearcherState } from '../state';
import { RESEARCHER_STATE_MESSAGES } from '../messages';

const SYSTEM_PROMPT =
	'You are a response strategist. Given a user query and its classified intent, ' +
	'decide whether the request needs explicit research or should be answered directly. ' +
	'Do not assume every message needs research.\n\n' +
	'Set needsResearch=false for cases like greetings, pleasantries, acknowledgements, ' +
	'simple conversational turns, or direct questions that can be answered without a ' +
	'full research pass. Set needsResearch=true only when the user is explicitly asking ' +
	'for research, multi-angle analysis, careful comparison, or a thorough investigation.\n\n' +
	'Choose responseLength as one of: short, medium, long.\n' +
	'  - short: a brief natural reply, usually 1-3 sentences\n' +
	'  - medium: a direct answer with moderate detail\n' +
	'  - long: a detailed, structured answer\n\n' +
	'Return ONLY valid JSON with this exact shape:\n' +
	'{"needsResearch":false,"responseLength":"short","strategy":"Respond briefly and conversationally."}';

type ResponseLength = 'short' | 'medium' | 'long';

interface StrategyDecision {
	needsResearch: boolean;
	responseLength: ResponseLength;
	strategy: string;
}

const CASUAL_PATTERNS = [
	/\bhello\b/i,
	/\bhi\b/i,
	/\bhey\b/i,
	/\bhow are you\b/i,
	/\bgood (morning|afternoon|evening)\b/i,
	/\bthank(s| you)\b/i,
	/\bbye\b/i,
	/\bgoodbye\b/i,
	/\bsee you\b/i,
];

const RESEARCH_PATTERNS = [
	/\bresearch\b/i,
	/\banaly[sz]e\b/i,
	/\bcomparison?\b/i,
	/\bcompare\b/i,
	/\bdeep dive\b/i,
	/\binvestigate\b/i,
	/\bpros and cons\b/i,
	/\bcurrent\b/i,
	/\blatest\b/i,
	/\btoday\b/i,
	/\brecent\b/i,
];

function buildHumanMessage(prompt: string, intent: string): string {
	return `User query: ${prompt}\n\nClassified intent: ${intent}`;
}

function normaliseResponseLength(value: unknown): ResponseLength {
	if (value === 'short' || value === 'medium' || value === 'long') {
		return value;
	}
	return 'medium';
}

function looksLikeCasualConversation(prompt: string): boolean {
	const trimmed = prompt.trim();
	if (!trimmed) return false;
	if (trimmed.split(/\s+/).length > 12) return false;

	return CASUAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function inferNeedsResearch(prompt: string, rawStrategy: string): boolean {
	if (looksLikeCasualConversation(prompt)) {
		return false;
	}

	return RESEARCH_PATTERNS.some((pattern) => pattern.test(`${prompt}\n${rawStrategy}`));
}

function inferResponseLength(
	prompt: string,
	rawStrategy: string,
	needsResearch: boolean
): ResponseLength {
	const combined = `${prompt}\n${rawStrategy}`;

	if (/\b(short|brief|concise|quick)\b/i.test(combined) || looksLikeCasualConversation(prompt)) {
		return 'short';
	}
	if (/\b(long|detailed|thorough|comprehensive|deep)\b/i.test(combined) || needsResearch) {
		return 'long';
	}

	return 'medium';
}

function buildFallbackStrategy(
	prompt: string,
	rawStrategy: string,
	needsResearch: boolean,
	responseLength: ResponseLength
): string {
	const trimmed = rawStrategy.trim();
	if (trimmed) {
		return trimmed;
	}

	if (looksLikeCasualConversation(prompt)) {
		return 'Respond briefly and naturally in a conversational tone. No research or heavy structure is needed.';
	}
	if (needsResearch) {
		return `Use a ${responseLength} research-oriented answer that covers the main angles without padding.`;
	}

	return `Answer directly in a ${responseLength} format without forcing a research workflow.`;
}

function parseDecision(content: string, prompt: string): StrategyDecision {
	try {
		const parsed: unknown = JSON.parse(content.trim());

		if (typeof parsed === 'object' && parsed !== null) {
			const candidate = parsed as Record<string, unknown>;
			const needsResearch =
				typeof candidate['needsResearch'] === 'boolean'
					? candidate['needsResearch']
					: inferNeedsResearch(prompt, String(candidate['strategy'] ?? ''));
			const responseLength = normaliseResponseLength(candidate['responseLength']);
			const strategy = buildFallbackStrategy(
				prompt,
				typeof candidate['strategy'] === 'string' ? candidate['strategy'] : '',
				needsResearch,
				responseLength
			);

			return {
				needsResearch,
				responseLength,
				strategy,
			};
		}
	} catch {
		// Fall through to heuristic fallback.
	}

	const needsResearch = inferNeedsResearch(prompt, content);
	const responseLength = inferResponseLength(prompt, content, needsResearch);

	return {
		needsResearch,
		responseLength,
		strategy: buildFallbackStrategy(prompt, content, needsResearch, responseLength),
	};
}

export async function evaluateNode(
	state: typeof ResearcherState.State,
	model: BaseChatModel
): Promise<Partial<typeof ResearcherState.State>> {
	const messages = [
		new SystemMessage(SYSTEM_PROMPT),
		new HumanMessage(buildHumanMessage(state.prompt, state.intent)),
	];

	const response = await model.invoke(messages);
	const decision = parseDecision(
		typeof response.content === 'string' ? response.content : '',
		state.prompt
	);

	return {
		strategy: decision.strategy,
		requiresResearch: decision.needsResearch,
		responseLength: decision.responseLength,
		stateMessage: decision.needsResearch
			? RESEARCHER_STATE_MESSAGES.PLAN
			: RESEARCHER_STATE_MESSAGES.COMPOSE,
	};
}
