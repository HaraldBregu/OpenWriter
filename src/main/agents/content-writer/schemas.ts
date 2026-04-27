import type { ContentWriterJsonSchema, ContentWriterRoute, ContentWriterRouting } from './types';

const ROUTE_VALUES: ContentWriterRoute[] = ['short', 'grammar', 'long'];

export const ROUTE_SCHEMA: ContentWriterJsonSchema = {
	name: 'content_writer_route',
	schema: {
		type: 'object',
		additionalProperties: false,
		required: ['route', 'reasoning'],
		properties: {
			route: { type: 'string', enum: ROUTE_VALUES },
			reasoning: { type: 'string' },
		},
	},
};

export function parseRouting(raw: string): ContentWriterRouting {
	const parsed = parseJson(raw);
	const route = parsed.route;
	if (typeof route !== 'string' || !ROUTE_VALUES.includes(route as ContentWriterRoute)) {
		throw new Error(`Invalid route: ${JSON.stringify(route)}`);
	}
	const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';
	return { route: route as ContentWriterRoute, reasoning };
}

function parseJson(raw: string): Record<string, unknown> {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error('Empty response');
	try {
		return JSON.parse(trimmed) as Record<string, unknown>;
	} catch {
		const match = /\{[\s\S]*\}/.exec(trimmed);
		if (!match) throw new Error('No JSON object found');
		return JSON.parse(match[0]) as Record<string, unknown>;
	}
}
