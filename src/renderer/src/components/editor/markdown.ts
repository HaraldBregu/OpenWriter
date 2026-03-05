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
		image: defaultNodes.image,
		hardBreak: defaultNodes.hard_break,
		text: defaultNodes.text,
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

md.core.ruler.after('inline', 'underline_html', (state) => {
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
