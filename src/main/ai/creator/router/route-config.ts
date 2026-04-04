import type { CreatorAgentId, CreatorIntent } from '../types';

interface IntentSignalRule {
	readonly label: string;
	readonly pattern: RegExp;
	readonly score: number;
}

export interface IntentRouteConfig {
	readonly intent: CreatorIntent;
	readonly suggestedAgentId: CreatorAgentId;
	readonly keywords: readonly string[];
	readonly signals: readonly IntentSignalRule[];
	readonly rationale: string;
}

export const FOLLOW_UP_PATTERN =
	/\b(continue|same|again|that|this|it|those|these|another version|more like that)\b/i;

export const FOLLOW_UP_EDIT_PATTERN =
	/\b(shorter|longer|rewrite|rephrase|polish|improve|fix|expand|trim|change the tone)\b/i;

export const ROUTE_CONFIGS: readonly IntentRouteConfig[] = [
	{
		intent: 'create',
		suggestedAgentId: 'writer-agent',
		keywords: [
			'write',
			'draft',
			'compose',
			'create',
			'outline',
			'story',
			'article',
			'email',
			'proposal',
			'script',
			'blog post',
			'essay',
		],
		signals: [
			{
				label: 'request asks for new written output',
				pattern: /\b(write|draft|compose|create)\b.*\b(email|article|story|proposal|script|post|essay)\b/i,
				score: 2,
			},
			{
				label: 'request asks for an outline or structure',
				pattern: /\b(outline|structure|table of contents)\b/i,
				score: 2,
			},
		],
		rationale: 'The request is asking for a new artifact to be produced.',
	},
	{
		intent: 'edit',
		suggestedAgentId: 'editor-agent',
		keywords: [
			'edit',
			'rewrite',
			'revise',
			'polish',
			'improve',
			'fix',
			'shorten',
			'expand',
			'refine',
			'rephrase',
			'proofread',
			'clean up',
		],
		signals: [
			{
				label: 'request asks for revision',
				pattern: /\b(rewrite|revise|improve|refine|polish|proofread)\b/i,
				score: 2,
			},
			{
				label: 'request changes length or tone',
				pattern: /\b(shorter|longer|more concise|expand|tone|voice|clarity)\b/i,
				score: 2,
			},
		],
		rationale: 'The request is asking to transform an existing artifact.',
	},
	{
		intent: 'brainstorm',
		suggestedAgentId: 'brainstorm-agent',
		keywords: [
			'brainstorm',
			'ideas',
			'idea',
			'concepts',
			'suggestions',
			'options',
			'angles',
			'variations',
			'names',
			'titles',
		],
		signals: [
			{
				label: 'request asks for ideas',
				pattern: /\b(brainstorm|give me ideas|list ideas|suggest)\b/i,
				score: 2,
			},
			{
				label: 'request asks for naming or title exploration',
				pattern: /\b(names?|titles?|taglines?)\b/i,
				score: 2,
			},
		],
		rationale: 'The request is exploring options before drafting.',
	},
	{
		intent: 'research',
		suggestedAgentId: 'research-agent',
		keywords: [
			'research',
			'investigate',
			'compare',
			'analyze',
			'facts',
			'sources',
			'evidence',
			'look up',
			'find information',
			'background',
		],
		signals: [
			{
				label: 'request asks for investigation',
				pattern: /\b(research|investigate|look up|find information)\b/i,
				score: 2,
			},
			{
				label: 'request asks for comparison or evidence',
				pattern: /\b(compare|analysis|evidence|sources?|background)\b/i,
				score: 2,
			},
		],
		rationale: 'The request needs information gathering before generation.',
	},
	{
		intent: 'summarize',
		suggestedAgentId: 'summarizer-agent',
		keywords: ['summarize', 'summary', 'recap', 'tldr', 'key points', 'condense'],
		signals: [
			{
				label: 'request asks for a summary',
				pattern: /\b(summarize|summary|recap|tl;dr|condense)\b/i,
				score: 3,
			},
		],
		rationale: 'The request is compressing existing material.',
	},
	{
		intent: 'translate',
		suggestedAgentId: 'translator-agent',
		keywords: [
			'translate',
			'translation',
			'into english',
			'into italian',
			'into spanish',
			'into french',
			'in german',
		],
		signals: [
			{
				label: 'request asks for translation',
				pattern: /\btranslate\b|\btranslation\b/i,
				score: 3,
			},
			{
				label: 'request specifies target language',
				pattern: /\binto (english|italian|spanish|french|german|portuguese)\b/i,
				score: 2,
			},
		],
		rationale: 'The request is changing language while preserving meaning.',
	},
	{
		intent: 'chat',
		suggestedAgentId: 'conversation-agent',
		keywords: ['help', 'explain', 'question', 'what', 'why', 'how'],
		signals: [
			{
				label: 'request is phrased as a direct question',
				pattern: /^(what|why|how|can you|could you|would you)\b/i,
				score: 2,
			},
		],
		rationale: 'The request looks conversational rather than task-specific.',
	},
];

const ROUTE_CONFIG_MAP = new Map(ROUTE_CONFIGS.map((config) => [config.intent, config]));

export function getRouteConfig(intent: CreatorIntent): IntentRouteConfig | undefined {
	return ROUTE_CONFIG_MAP.get(intent);
}
