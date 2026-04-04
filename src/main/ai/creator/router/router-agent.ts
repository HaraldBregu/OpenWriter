import type { LoggerService } from '../../../services/logger';
import { BaseCreatorAgent } from '../agent';
import {
	CREATOR_ROUTER_AGENT_ID,
	type CreatorIntent,
	type CreatorIntentCandidate,
	type CreatorMessage,
	type CreatorRequest,
	type CreatorRouteDecision,
} from '../types';
import {
	FOLLOW_UP_EDIT_PATTERN,
	FOLLOW_UP_PATTERN,
	ROUTE_CONFIGS,
	getRouteConfig,
} from './route-config';

const LOG_SOURCE = 'CreatorRouterAgent';
const HISTORY_WINDOW = 3;

interface ScoredCandidate {
	readonly intent: CreatorIntent;
	readonly score: number;
	readonly matchedSignals: string[];
}

export class CreatorRouterAgent extends BaseCreatorAgent<CreatorRequest, CreatorRouteDecision> {
	constructor(private readonly logger?: LoggerService) {
		super(CREATOR_ROUTER_AGENT_ID, 'Creator Router');
	}

	async run(input: CreatorRequest): Promise<CreatorRouteDecision> {
		const normalizedPrompt = this.normalizeText(input.prompt);

		if (normalizedPrompt.length === 0) {
			return {
				primaryIntent: 'unknown',
				suggestedAgentId: this.id,
				normalizedPrompt: '',
				confidence: 0,
				shouldClarify: true,
				rationale: 'The request is empty, so the router cannot infer an intent.',
				candidates: [],
			};
		}

		const baseCandidates = this.scorePrompt(normalizedPrompt);
		const candidatesWithHistory = this.applyHistoryBoosts(baseCandidates, normalizedPrompt, input.history);
		const ranked = candidatesWithHistory.sort((left, right) => right.score - left.score);
		const winner = ranked[0];
		const runnerUp = ranked[1];

		if (!winner || winner.score <= 0) {
			this.logger?.debug(LOG_SOURCE, 'No routing signals found', {
				promptLength: normalizedPrompt.length,
			});

			return {
				primaryIntent: 'unknown',
				suggestedAgentId: this.id,
				normalizedPrompt,
				confidence: 0.2,
				shouldClarify: true,
				rationale: 'The request does not contain enough routing signals yet.',
				candidates: [],
			};
		}

		const topScore = winner.score;
		const confidence = this.calculateWinnerConfidence(topScore, runnerUp?.score ?? 0);
		const shouldClarify = topScore < 2 || topScore - (runnerUp?.score ?? 0) <= 1;
		const routeConfig = getRouteConfig(winner.intent);
		const candidates: CreatorIntentCandidate[] = ranked.map((candidate) => ({
			intent: candidate.intent,
			suggestedAgentId: getRouteConfig(candidate.intent)?.suggestedAgentId ?? this.id,
			score: candidate.score,
			confidence: Number((candidate.score / topScore).toFixed(2)),
			matchedSignals: [...candidate.matchedSignals],
		}));

		this.logger?.info(LOG_SOURCE, 'Routed creator request', {
			primaryIntent: winner.intent,
			score: winner.score,
			confidence,
			shouldClarify,
			suggestedAgentId: routeConfig?.suggestedAgentId ?? this.id,
		});

		return {
			primaryIntent: winner.intent,
			suggestedAgentId: routeConfig?.suggestedAgentId ?? this.id,
			normalizedPrompt,
			confidence,
			shouldClarify,
			rationale: this.buildRationale(winner, routeConfig?.rationale),
			candidates,
		};
	}

	private scorePrompt(prompt: string): ScoredCandidate[] {
		return ROUTE_CONFIGS.map((config) => {
			const matchedSignals: string[] = [];
			let score = 0;

			for (const keyword of config.keywords) {
				if (this.matchesKeyword(prompt, keyword)) {
					score += keyword.includes(' ') ? 2 : 1;
					matchedSignals.push(`keyword:${keyword}`);
				}
			}

			for (const signal of config.signals) {
				if (signal.pattern.test(prompt)) {
					score += signal.score;
					matchedSignals.push(signal.label);
				}
			}

			return {
				intent: config.intent,
				score,
				matchedSignals,
			};
		}).filter((candidate) => candidate.score > 0);
	}

	private applyHistoryBoosts(
		candidates: ScoredCandidate[],
		prompt: string,
		history?: CreatorMessage[]
	): ScoredCandidate[] {
		if (!history || history.length === 0) {
			return candidates;
		}

		const shouldLookBack = FOLLOW_UP_PATTERN.test(prompt) || prompt.split(' ').length <= 5;
		if (!shouldLookBack) {
			return candidates;
		}

		const lastUserPrompt = [...history]
			.reverse()
			.filter((message) => message.role === 'user')
			.slice(0, HISTORY_WINDOW)
			.map((message) => this.normalizeText(message.content))
			.find((value) => value.length > 0);

		if (!lastUserPrompt) {
			return candidates;
		}

		const boosted = new Map<CreatorIntent, ScoredCandidate>(
			candidates.map((candidate) => [candidate.intent, { ...candidate }])
		);

		const lastIntent = this.scorePrompt(lastUserPrompt).sort((left, right) => right.score - left.score)[0];
		if (lastIntent && lastIntent.intent !== 'chat') {
			const existing = boosted.get(lastIntent.intent);
			const historySignal = `history:${lastIntent.intent}`;
			const historyScore = 1.5;

			if (existing) {
				boosted.set(lastIntent.intent, {
					...existing,
					score: existing.score + historyScore,
					matchedSignals: [...existing.matchedSignals, historySignal],
				});
			} else {
				boosted.set(lastIntent.intent, {
					intent: lastIntent.intent,
					score: historyScore,
					matchedSignals: [historySignal],
				});
			}
		}

		if (FOLLOW_UP_EDIT_PATTERN.test(prompt)) {
			const existing = boosted.get('edit');
			const editSignal = 'history:follow-up revision';

			if (existing) {
				boosted.set('edit', {
					...existing,
					score: existing.score + 2,
					matchedSignals: [...existing.matchedSignals, editSignal],
				});
			} else {
				boosted.set('edit', {
					intent: 'edit',
					score: 2,
					matchedSignals: [editSignal],
				});
			}
		}

		return [...boosted.values()];
	}

	private matchesKeyword(prompt: string, keyword: string): boolean {
		if (keyword.includes(' ')) {
			return prompt.toLowerCase().includes(keyword);
		}

		const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		return new RegExp(`\\b${escaped}\\b`, 'i').test(prompt);
	}

	private calculateWinnerConfidence(score: number, runnerUpScore: number): number {
		const baseConfidence = 0.35 + Math.min(score, 6) * 0.08;
		const separationBonus = Math.min(Math.max(score - runnerUpScore, 0), 3) * 0.05;
		return Number(Math.min(0.95, baseConfidence + separationBonus).toFixed(2));
	}

	private buildRationale(candidate: ScoredCandidate, baseRationale?: string): string {
		const matchedSignals = candidate.matchedSignals.join(', ');
		return [baseRationale ?? 'The router matched the request against known creator intents.', matchedSignals]
			.filter(Boolean)
			.join(' Signals: ');
	}
}
