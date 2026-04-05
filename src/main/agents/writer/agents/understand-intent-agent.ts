import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { LoggerService } from '../../../services/logger';
import { toLangChainHistoryMessages } from '../../core/history';
import { readLabeledValue } from '../agent-output';
import { WRITER_STATE_MESSAGES } from '../messages';
import {
	createWriterSpecialistAgent,
	invokeWriterSpecialist,
	type WriterSpecialistAgent,
} from '../specialist-agent';
import { WRITER_INTENT, type WriterIntent, WriterState } from '../state';

const SYSTEM_PROMPT = `You are the intent and context analyst in a writer workflow.

You receive the user's request and surrounding writing context.

Return exactly six lines in this format:

Normalized request: ...
Intent: continue|improve|transform|expand|condense|unclear
Audience: ...
Tone: ...
Length: ...
Notes: ...

Rules:

- Prefer inferring the best helpful action from the request and context.
- Use continue for natural continuation from context.
- Use improve for clarity, tone, and structure refinement.
- Use transform for rewriting or adapting style, format, or perspective.
- Use expand for adding detail, depth, or examples.
- Use condense for summarizing or shortening while preserving key ideas.
- Use unclear only when the request is genuinely ambiguous after considering the
  surrounding context and conversation history.`;

interface IntentResult {
	readonly normalizedPrompt: string;
	readonly intent: WriterIntent;
	readonly audienceGuidance: string;
	readonly toneGuidance: string;
	readonly lengthGuidance: string;
	readonly intentFindings: string;
}

const CONTINUE_PATTERN =
	/\b(continue|continue writing|finish this|finish the paragraph|carry on|pick up from here|keep writing|next sentence|next paragraph|complete this)\b/i;
const IMPROVE_PATTERN =
	/\b(improve|polish|edit|refine|clarify|clean up|fix the writing|make this better|tighten)\b/i;
const TRANSFORM_PATTERN =
	/\b(rewrite|reword|rephrase|transform|adapt|change the style|make it sound|turn this into|convert this)\b/i;
const EXPAND_PATTERN =
	/\b(expand|elaborate|add detail|add more|go deeper|develop this|extend this|add examples)\b/i;
const CONDENSE_PATTERN =
	/\b(condense|summarize|shorten|make it shorter|compress|briefen|trim this|reduce this)\b/i;

function normalizeIntent(value: string | undefined, fallback: WriterIntent): WriterIntent {
	const normalized = value?.trim().toLowerCase();

	switch (normalized) {
		case WRITER_INTENT.CONTINUE:
		case WRITER_INTENT.IMPROVE:
		case WRITER_INTENT.TRANSFORM:
		case WRITER_INTENT.EXPAND:
		case WRITER_INTENT.CONDENSE:
		case WRITER_INTENT.UNCLEAR:
			return normalized;
		default:
			return fallback;
	}
}

function inferFallbackIntent(prompt: string): WriterIntent {
	if (CONDENSE_PATTERN.test(prompt)) return WRITER_INTENT.CONDENSE;
	if (EXPAND_PATTERN.test(prompt)) return WRITER_INTENT.EXPAND;
	if (TRANSFORM_PATTERN.test(prompt)) return WRITER_INTENT.TRANSFORM;
	if (IMPROVE_PATTERN.test(prompt)) return WRITER_INTENT.IMPROVE;
	if (CONTINUE_PATTERN.test(prompt)) return WRITER_INTENT.CONTINUE;
	return WRITER_INTENT.UNCLEAR;
}

function inferLengthGuidance(prompt: string): string {
	const match = prompt.match(/\b(\d+)\s+(word|words|sentence|sentences|paragraph|paragraphs)\b/i);

	if (!match) {
		return 'Match the length implied by the request and context.';
	}

	return `Keep it to about ${match[1]} ${match[2].toLowerCase()}.`;
}

function buildFallback(prompt: string): IntentResult {
	const normalizedPrompt = prompt.trim() || 'Continue writing naturally from the provided context.';
	const intent = inferFallbackIntent(normalizedPrompt);

	return {
		normalizedPrompt,
		intent,
		audienceGuidance: 'Use the audience implied by the request and surrounding text.',
		toneGuidance: 'Match the surrounding document voice unless the request says otherwise.',
		lengthGuidance: inferLengthGuidance(normalizedPrompt),
		intentFindings: 'Used fallback intent heuristics because structured analysis was unavailable.',
	};
}

function parseIntentResult(raw: string, prompt: string): IntentResult {
	const fallback = buildFallback(prompt);

	return {
		normalizedPrompt: readLabeledValue(raw, 'Normalized request') || fallback.normalizedPrompt,
		intent: normalizeIntent(readLabeledValue(raw, 'Intent'), fallback.intent),
		audienceGuidance: readLabeledValue(raw, 'Audience') || fallback.audienceGuidance,
		toneGuidance: readLabeledValue(raw, 'Tone') || fallback.toneGuidance,
		lengthGuidance: readLabeledValue(raw, 'Length') || fallback.lengthGuidance,
		intentFindings: readLabeledValue(raw, 'Notes') || fallback.intentFindings,
	};
}

function buildHumanMessage(prompt: string): string {
	return ['User request and surrounding context:', prompt].join('\n');
}

export function createUnderstandIntentAgent(model: BaseChatModel): WriterSpecialistAgent {
	return createWriterSpecialistAgent(model, SYSTEM_PROMPT);
}

export async function understandIntentAgent(
	state: typeof WriterState.State,
	agent: WriterSpecialistAgent,
	logger?: LoggerService
): Promise<Partial<typeof WriterState.State>> {
	const prompt = state.prompt.trim();

	if (prompt.length === 0) {
		const fallback = buildFallback(prompt);
		logger?.debug('WriterUnderstandIntentAgent', 'Skipping intent analysis for empty prompt');
		return {
			normalizedPrompt: fallback.normalizedPrompt,
			intent: fallback.intent,
			audienceGuidance: fallback.audienceGuidance,
			toneGuidance: fallback.toneGuidance,
			lengthGuidance: fallback.lengthGuidance,
			intentFindings: fallback.intentFindings,
			phaseLabel: WRITER_STATE_MESSAGES.DRAFT,
		};
	}

	logger?.debug('WriterUnderstandIntentAgent', 'Starting intent analysis', {
		promptLength: prompt.length,
	});

	const messages = [
		...toLangChainHistoryMessages(state.history),
		new HumanMessage(buildHumanMessage(prompt)),
	];
	const rawDecision = await invokeWriterSpecialist(agent, messages);
	const parsed = parseIntentResult(rawDecision, prompt);

	logger?.info('WriterUnderstandIntentAgent', 'Intent analysis completed', {
		intent: parsed.intent,
		normalizedLength: parsed.normalizedPrompt.length,
	});

	return {
		normalizedPrompt: parsed.normalizedPrompt,
		intent: parsed.intent,
		audienceGuidance: parsed.audienceGuidance,
		toneGuidance: parsed.toneGuidance,
		lengthGuidance: parsed.lengthGuidance,
		intentFindings: parsed.intentFindings,
		phaseLabel: WRITER_STATE_MESSAGES.DRAFT,
	};
}
