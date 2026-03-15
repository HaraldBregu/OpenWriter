import {
	MarkdownSerializer,
	MarkdownParser,
	defaultMarkdownSerializer,
} from 'prosemirror-markdown';
import type { Node as ProseMirrorNode, Mark, Schema } from '@tiptap/pm/model';
import MarkdownIt from 'markdown-it';

type NodeSerializerFn = (
	state: InstanceType<typeof import('prosemirror-markdown').MarkdownSerializerState>,
	node: ProseMirrorNode,
	parent: ProseMirrorNode,
	index: number
) => void;

type MarkSerializerSpec = {
	open:
		| string
		| ((
				state: InstanceType<typeof import('prosemirror-markdown').MarkdownSerializerState>,
				mark: Mark,
				parent: ProseMirrorNode,
				index: number
		  ) => string);
	close:
		| string
		| ((
				state: InstanceType<typeof import('prosemirror-markdown').MarkdownSerializerState>,
				mark: Mark,
				parent: ProseMirrorNode,
				index: number
		  ) => string);
	mixable?: boolean;
	expelEnclosingWhitespace?: boolean;
	escape?: boolean;
};

const defaultNodes = defaultMarkdownSerializer.nodes as Record<string, NodeSerializerFn>;
const defaultMarks = defaultMarkdownSerializer.marks as Record<string, MarkSerializerSpec>;

function escapeHtmlAttr(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

const IMG_TAG_RE = /^<img\s+([\s\S]*?)\s*\/?>$/i;
const ATTR_RE = /(\w+)=["']([^"']*)["']/g;

function parseImgTag(html: string): Record<string, string> | null {
	const match = html.trim().match(IMG_TAG_RE);
	if (!match) return null;
	const attrs: Record<string, string> = {};
	let m: RegExpExecArray | null;
	while ((m = ATTR_RE.exec(match[1])) !== null) {
		attrs[m[1].toLowerCase()] = m[2];
	}
	ATTR_RE.lastIndex = 0;
	return Object.keys(attrs).length > 0 ? attrs : null;
}

function backticksFor(node: ProseMirrorNode, side: -1 | 1): string {
	const ticks = /`+/g;
	let m: RegExpExecArray | null;
	let len = 0;
	if (node.isText) {
		while ((m = ticks.exec(node.text!)) !== null) {
			len = Math.max(len, m[0].length);
		}
	}
	let result = len > 0 && side > 0 ? ' `' : '`';
	for (let i = 0; i < len; i++) result += '`';
	if (len > 0 && side < 0) result += ' ';
	return result;
}

const tiptapMarkdownSerializer = new MarkdownSerializer(
	{
		blockquote: defaultNodes.blockquote,
		codeBlock: defaultNodes.code_block,
		heading: defaultNodes.heading,
		horizontalRule: defaultNodes.horizontal_rule,
		bulletList: defaultNodes.bullet_list,
		orderedList(state, node) {
			const start = (node.attrs.start ?? 1) as number;
			state.renderList(node, '  ', (i) => `${start + i}. `);
		},
		listItem: defaultNodes.list_item,
		paragraph: defaultNodes.paragraph,
		image(state, node) {
			const src: string = (node.attrs.src as string) || '';
			const alt: string = (node.attrs.alt as string) || '';
			const title: string | null = (node.attrs.title as string) || null;
			const width: number | null = (node.attrs.width as number) || null;
			const height: number | null = (node.attrs.height as number) || null;

			if (width || height) {
				const parts = [`<img src="${escapeHtmlAttr(src)}"`];
				if (alt) parts.push(`alt="${escapeHtmlAttr(alt)}"`);
				if (title) parts.push(`title="${escapeHtmlAttr(title)}"`);
				if (width) parts.push(`width="${width}"`);
				if (height) parts.push(`height="${height}"`);
				parts.push('/>');
				state.write(parts.join(' '));
			} else {
				state.write(
					'![' +
						state.esc(alt) +
						'](' +
						src +
						(title ? ` "${title.replace(/"/g, '\\"')}"` : '') +
						')'
				);
			}
			state.closeBlock(node);
		},
		hardBreak: defaultNodes.hard_break,
		text: defaultNodes.text,
		agentPrompt() {
			// Transient UI node — omit from markdown output.
		},
		imagePlaceholder() {
			// Transient UI node — omit from markdown output.
		},
		doc(state, node) {
			state.renderContent(node);
		},
	},
	{
		bold: defaultMarks.strong,
		italic: defaultMarks.em,
		strike: {
			open: '~~',
			close: '~~',
			mixable: true,
			expelEnclosingWhitespace: true,
		},
		underline: {
			open: '<u>',
			close: '</u>',
			mixable: true,
		},
		code: {
			open(_state, _mark, parent, index) {
				return backticksFor(parent.child(index), -1);
			},
			close(_state, _mark, parent, index) {
				return backticksFor(parent.child(index - 1), 1);
			},
			escape: false,
		},
		link: defaultMarks.link,
	}
);

const md = new MarkdownIt('commonmark', { html: true }).enable('strikethrough');

md.core.ruler.after('inline', 'image_block', (state) => {
	const tokens = state.tokens;
	const newTokens: import('markdown-it/lib/token.mjs').default[] = [];
	let i = 0;
	while (i < tokens.length) {
		// Look for the triplet: paragraph_open, inline (image-only), paragraph_close
		const inlineChildren = tokens[i + 1]?.children;
		if (
			i + 2 < tokens.length &&
			tokens[i].type === 'paragraph_open' &&
			tokens[i + 1].type === 'inline' &&
			tokens[i + 2].type === 'paragraph_close' &&
			inlineChildren
		) {
			const meaningful = inlineChildren.filter(
				(c) => c.type !== 'softbreak' && !(c.type === 'text' && !c.content.trim())
			);
			if (meaningful.length === 1 && meaningful[0].type === 'image') {
				const imgToken = meaningful[0];
				const blockImg = new state.Token('image', 'img', 0);
				blockImg.attrs = imgToken.attrs;
				blockImg.children = imgToken.children;
				blockImg.content = imgToken.content;
				newTokens.push(blockImg);
				i += 3;
				continue;
			}
		}
		newTokens.push(tokens[i]);
		i++;
	}
	state.tokens = newTokens;
});

md.core.ruler.after('image_block', 'html_image_block', (state) => {
	const tokens = state.tokens;
	const newTokens: import('markdown-it/lib/token.mjs').default[] = [];
	for (const tok of tokens) {
		if (tok.type === 'html_block') {
			const parsed = parseImgTag(tok.content);
			if (parsed && parsed.src) {
				const blockImg = new state.Token('image', 'img', 0);
				blockImg.attrSet('src', parsed.src);
				if (parsed.title) blockImg.attrSet('title', parsed.title);
				if (parsed.width) blockImg.attrSet('width', parsed.width);
				if (parsed.height) blockImg.attrSet('height', parsed.height);
				blockImg.children = [];
				if (parsed.alt) {
					const altToken = new state.Token('text', '', 0);
					altToken.content = parsed.alt;
					blockImg.children.push(altToken);
				}
				newTokens.push(blockImg);
				continue;
			}
		}
		newTokens.push(tok);
	}
	state.tokens = newTokens;
});

md.core.ruler.after('html_image_block', 'underline_html', (state) => {
	for (const blockToken of state.tokens) {
		if (blockToken.type !== 'inline' || !blockToken.children) continue;
		const newChildren: import('markdown-it/lib/token.mjs').default[] = [];
		for (const tok of blockToken.children) {
			if (tok.type === 'html_inline') {
				const tag = tok.content.trim().toLowerCase();
				if (tag === '<u>') {
					const open = new state.Token('u_open', 'u', 1);
					open.markup = '<u>';
					newChildren.push(open);
					continue;
				}
				if (tag === '</u>') {
					const close = new state.Token('u_close', 'u', -1);
					close.markup = '</u>';
					newChildren.push(close);
					continue;
				}
			}
			newChildren.push(tok);
		}
		blockToken.children = newChildren;
	}
});

const TIPTAP_TOKEN_MAP = {
	blockquote: { block: 'blockquote' },
	paragraph: { block: 'paragraph' },
	list_item: { block: 'listItem' },
	bullet_list: { block: 'bulletList' },
	ordered_list: {
		block: 'orderedList',
		getAttrs: (tok: import('markdown-it/lib/token.mjs').default) => ({
			start: +(tok.attrGet('start') ?? 1),
		}),
	},
	heading: {
		block: 'heading',
		getAttrs: (tok: import('markdown-it/lib/token.mjs').default) => ({ level: +tok.tag.slice(1) }),
	},
	code_block: { block: 'codeBlock', noCloseToken: true },
	fence: {
		block: 'codeBlock',
		getAttrs: (tok: import('markdown-it/lib/token.mjs').default) => ({ language: tok.info || '' }),
		noCloseToken: true,
	},
	hr: { node: 'horizontalRule' },
	image: {
		node: 'image',
		getAttrs: (tok: import('markdown-it/lib/token.mjs').default) => ({
			src: tok.attrGet('src'),
			title: tok.attrGet('title') || null,
			alt: (tok.children as Array<{ content: string }> | null)?.[0]?.content || null,
			width: tok.attrGet('width') ? Number(tok.attrGet('width')) : null,
			height: tok.attrGet('height') ? Number(tok.attrGet('height')) : null,
		}),
	},
	hardbreak: { node: 'hardBreak' },
	em: { mark: 'italic' },
	strong: { mark: 'bold' },
	s: { mark: 'strike' },
	link: {
		mark: 'link',
		getAttrs: (tok: import('markdown-it/lib/token.mjs').default) => ({
			href: tok.attrGet('href'),
			title: tok.attrGet('title') || null,
		}),
	},
	code_inline: { mark: 'code' },
	u: { mark: 'underline' },
};

let cachedParser: MarkdownParser | null = null;
let cachedSchema: Schema | null = null;

function getParser(schema: Schema): MarkdownParser {
	if (cachedParser && cachedSchema === schema) return cachedParser;
	const filteredTokenMap = Object.fromEntries(
		Object.entries(TIPTAP_TOKEN_MAP).filter(([, spec]) => {
			if ('block' in spec) return spec.block in schema.nodes;
			if ('node' in spec) return spec.node in schema.nodes;
			if ('mark' in spec) return spec.mark in schema.marks;
			return false;
		})
	);
	cachedSchema = schema;
	cachedParser = new MarkdownParser(schema, md, filteredTokenMap);
	return cachedParser;
}

export function markdownToTiptapJSON(schema: Schema, markdown: string): ProseMirrorNode | null {
	if (!markdown || !markdown.trim()) return null;
	try {
		return getParser(schema).parse(markdown);
	} catch (err) {
		console.error('[TextEditor] markdown parse error:', err);
		return null;
	}
}

export function tiptapDocToMarkdown(doc: ProseMirrorNode): string {
	try {
		return tiptapMarkdownSerializer.serialize(doc, { tightLists: true });
	} catch (err) {
		console.error('[TextEditor] markdown serialize error:', err);
		return '';
	}
}
