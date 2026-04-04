import type { LoggerService } from '../../../services/logger';

interface DuckDuckGoTopic {
	readonly Text?: string;
	readonly FirstURL?: string;
	readonly Topics?: DuckDuckGoTopic[];
}

interface DuckDuckGoResponse {
	readonly AbstractText?: string;
	readonly AbstractURL?: string;
	readonly AbstractSource?: string;
	readonly Answer?: string;
	readonly Definition?: string;
	readonly DefinitionURL?: string;
	readonly DefinitionSource?: string;
	readonly Heading?: string;
	readonly Results?: DuckDuckGoTopic[];
	readonly RelatedTopics?: DuckDuckGoTopic[];
}

export interface DuckDuckGoSearchResult {
	readonly title: string;
	readonly url: string;
	readonly snippet: string;
	readonly source: string;
}

function normalizeText(value: string | undefined): string {
	return value?.replace(/\s+/g, ' ').trim() ?? '';
}

function pushUniqueResult(
	results: DuckDuckGoSearchResult[],
	seen: Set<string>,
	title: string,
	url: string,
	snippet: string,
	source: string
): void {
	const normalizedTitle = normalizeText(title);
	const normalizedUrl = normalizeText(url);
	const normalizedSnippet = normalizeText(snippet);

	if (!normalizedTitle || !normalizedUrl || seen.has(normalizedUrl)) {
		return;
	}

	seen.add(normalizedUrl);
	results.push({
		title: normalizedTitle,
		url: normalizedUrl,
		snippet: normalizedSnippet || 'No summary provided by DuckDuckGo.',
		source: normalizeText(source) || 'DuckDuckGo',
	});
}

function collectTopicResults(
	topics: DuckDuckGoTopic[] | undefined,
	results: DuckDuckGoSearchResult[],
	seen: Set<string>
): void {
	if (!topics) {
		return;
	}

	for (const topic of topics) {
		if (Array.isArray(topic.Topics) && topic.Topics.length > 0) {
			collectTopicResults(topic.Topics, results, seen);
			continue;
		}

		pushUniqueResult(
			results,
			seen,
			topic.Text ?? 'Search result',
			topic.FirstURL ?? '',
			topic.Text ?? '',
			'DuckDuckGo'
		);
	}
}

export async function searchDuckDuckGo(
	query: string,
	logger?: LoggerService
): Promise<DuckDuckGoSearchResult[]> {
	const trimmedQuery = query.trim();

	if (trimmedQuery.length === 0) {
		return [];
	}

	const url = new URL('https://api.duckduckgo.com/');
	url.searchParams.set('q', trimmedQuery);
	url.searchParams.set('format', 'json');
	url.searchParams.set('no_html', '1');
	url.searchParams.set('no_redirect', '1');
	url.searchParams.set('skip_disambig', '1');

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 6000);

	try {
		const response = await fetch(url, {
			headers: {
				accept: 'application/json',
				'user-agent': 'OpenWriter/1.0',
			},
			signal: controller.signal,
		});

		if (!response.ok) {
			logger?.warn('DuckDuckGoSearch', 'DuckDuckGo search request failed', {
				status: response.status,
				queryLength: trimmedQuery.length,
			});
			return [];
		}

		const payload = (await response.json()) as DuckDuckGoResponse;
		const results: DuckDuckGoSearchResult[] = [];
		const seen = new Set<string>();

		pushUniqueResult(
			results,
			seen,
			payload.Heading ?? 'Answer',
			payload.AbstractURL ?? '',
			payload.AbstractText ?? payload.Answer ?? '',
			payload.AbstractSource ?? 'DuckDuckGo'
		);
		pushUniqueResult(
			results,
			seen,
			'Definition',
			payload.DefinitionURL ?? '',
			payload.Definition ?? '',
			payload.DefinitionSource ?? 'DuckDuckGo'
		);
		collectTopicResults(payload.Results, results, seen);
		collectTopicResults(payload.RelatedTopics, results, seen);

		return results.slice(0, 5);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		logger?.warn('DuckDuckGoSearch', `DuckDuckGo search failed: ${message}`, {
			queryLength: trimmedQuery.length,
		});
		return [];
	} finally {
		clearTimeout(timeout);
	}
}
