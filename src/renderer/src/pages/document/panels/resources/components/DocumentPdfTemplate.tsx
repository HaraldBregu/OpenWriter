import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { OutputFileMetadata } from '../../../../../../../shared/types';

interface DocumentPdfTemplateProps {
	readonly title: string;
	readonly content: string;
	readonly metadata: OutputFileMetadata | null;
}

const styles = StyleSheet.create({
	page: {
		paddingTop: 60,
		paddingBottom: 60,
		paddingHorizontal: 72,
		fontSize: 11,
		lineHeight: 1.6,
		color: '#1a1a1a',
	},
	title: {
		fontSize: 24,
		fontFamily: 'Helvetica-Bold',
		marginBottom: 6,
		color: '#111111',
		lineHeight: 1.3,
	},
	meta: {
		fontSize: 9,
		color: '#888888',
		marginBottom: 24,
	},
	divider: {
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		marginBottom: 20,
	},
	h1: {
		fontSize: 20,
		fontFamily: 'Helvetica-Bold',
		marginTop: 20,
		marginBottom: 8,
		color: '#111111',
	},
	h2: {
		fontSize: 16,
		fontFamily: 'Helvetica-Bold',
		marginTop: 16,
		marginBottom: 6,
		color: '#111111',
	},
	h3: {
		fontSize: 13,
		fontFamily: 'Helvetica-Bold',
		marginTop: 12,
		marginBottom: 4,
		color: '#333333',
	},
	paragraph: {
		marginBottom: 10,
		fontSize: 11,
		lineHeight: 1.7,
		color: '#374151',
	},
	listItemRow: {
		flexDirection: 'row',
		marginBottom: 4,
		paddingLeft: 8,
	},
	bullet: {
		width: 14,
		fontSize: 11,
		color: '#374151',
	},
	listText: {
		flex: 1,
		fontSize: 11,
		lineHeight: 1.6,
		color: '#374151',
	},
	codeBlock: {
		backgroundColor: '#f3f4f6',
		borderRadius: 4,
		padding: 10,
		marginBottom: 10,
		fontFamily: 'Courier',
		fontSize: 9.5,
		lineHeight: 1.5,
		color: '#1f2937',
	},
	blockquote: {
		borderLeftWidth: 3,
		borderLeftColor: '#d1d5db',
		paddingLeft: 10,
		marginBottom: 10,
		color: '#6b7280',
		fontSize: 11,
		lineHeight: 1.7,
	},
	hrSpacer: {
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
		marginVertical: 16,
	},
});

type InlineSegment = {
	text: string;
	bold?: boolean;
	italic?: boolean;
	code?: boolean;
};

type MarkdownBlock =
	| { type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'blockquote'; segments: InlineSegment[] }
	| { type: 'list-item'; segments: InlineSegment[]; ordered: boolean; index: number }
	| { type: 'code-block'; text: string }
	| { type: 'hr' };

function parseInline(text: string): InlineSegment[] {
	const segments: InlineSegment[] = [];
	const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|__(.+?)__|_(.+?)_|\*(.+?)\*|`(.+?)`)/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		if (match.index > lastIndex) {
			segments.push({ text: text.slice(lastIndex, match.index) });
		}
		if (match[2]) segments.push({ text: match[2], bold: true, italic: true });
		else if (match[3]) segments.push({ text: match[3], bold: true });
		else if (match[4]) segments.push({ text: match[4], bold: true });
		else if (match[5]) segments.push({ text: match[5], italic: true });
		else if (match[6]) segments.push({ text: match[6], italic: true });
		else if (match[7]) segments.push({ text: match[7], code: true });
		lastIndex = regex.lastIndex;
	}

	if (lastIndex < text.length) {
		segments.push({ text: text.slice(lastIndex) });
	}

	return segments.length > 0 ? segments : [{ text }];
}

function parseMarkdown(content: string): MarkdownBlock[] {
	const blocks: MarkdownBlock[] = [];
	const lines = content.split('\n');
	let i = 0;
	let orderedIndex = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (line.startsWith('```')) {
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith('```')) {
				codeLines.push(lines[i]);
				i++;
			}
			blocks.push({ type: 'code-block', text: codeLines.join('\n') });
			i++;
			continue;
		}

		if (/^[-*_]{3,}$/.test(line.trim())) {
			blocks.push({ type: 'hr' });
			i++;
			continue;
		}

		if (line.startsWith('# ')) {
			blocks.push({ type: 'h1', segments: parseInline(line.slice(2)) });
			i++;
			orderedIndex = 0;
			continue;
		}
		if (line.startsWith('## ')) {
			blocks.push({ type: 'h2', segments: parseInline(line.slice(3)) });
			i++;
			orderedIndex = 0;
			continue;
		}
		if (line.startsWith('### ')) {
			blocks.push({ type: 'h3', segments: parseInline(line.slice(4)) });
			i++;
			orderedIndex = 0;
			continue;
		}

		if (line.startsWith('> ')) {
			blocks.push({ type: 'blockquote', segments: parseInline(line.slice(2)) });
			i++;
			continue;
		}

		if (/^[-*+] /.test(line)) {
			blocks.push({
				type: 'list-item',
				segments: parseInline(line.slice(2)),
				ordered: false,
				index: 0,
			});
			orderedIndex = 0;
			i++;
			continue;
		}

		const orderedMatch = line.match(/^(\d+)\. /);
		if (orderedMatch) {
			orderedIndex++;
			blocks.push({
				type: 'list-item',
				segments: parseInline(line.slice(orderedMatch[0].length)),
				ordered: true,
				index: orderedIndex,
			});
			i++;
			continue;
		}

		if (line.trim() === '') {
			orderedIndex = 0;
			i++;
			continue;
		}

		const paragraphLines: string[] = [line];
		i++;
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!lines[i].startsWith('#') &&
			!lines[i].startsWith('```')
		) {
			paragraphLines.push(lines[i]);
			i++;
		}
		blocks.push({ type: 'paragraph', segments: parseInline(paragraphLines.join(' ')) });
		orderedIndex = 0;
	}

	return blocks;
}

function InlineText({ segments }: { readonly segments: InlineSegment[] }): React.ReactElement {
	return (
		<>
			{segments.map((seg, idx) => {
				if (seg.code) {
					return (
						<Text key={idx} style={{ fontFamily: 'Courier', fontSize: 10 }}>
							{seg.text}
						</Text>
					);
				}
				if (seg.bold && seg.italic) {
					return (
						<Text key={idx} style={{ fontFamily: 'Helvetica-BoldOblique' }}>
							{seg.text}
						</Text>
					);
				}
				if (seg.bold) {
					return (
						<Text key={idx} style={{ fontFamily: 'Helvetica-Bold' }}>
							{seg.text}
						</Text>
					);
				}
				if (seg.italic) {
					return (
						<Text key={idx} style={{ fontFamily: 'Helvetica-Oblique' }}>
							{seg.text}
						</Text>
					);
				}
				return <Text key={idx}>{seg.text}</Text>;
			})}
		</>
	);
}

function BlockRenderer({
	block,
	index,
}: {
	readonly block: MarkdownBlock;
	readonly index: number;
}): React.ReactElement | null {
	switch (block.type) {
		case 'h1':
			return (
				<Text key={index} style={styles.h1}>
					<InlineText segments={block.segments} />
				</Text>
			);
		case 'h2':
			return (
				<Text key={index} style={styles.h2}>
					<InlineText segments={block.segments} />
				</Text>
			);
		case 'h3':
			return (
				<Text key={index} style={styles.h3}>
					<InlineText segments={block.segments} />
				</Text>
			);
		case 'paragraph':
			return (
				<Text key={index} style={styles.paragraph}>
					<InlineText segments={block.segments} />
				</Text>
			);
		case 'blockquote':
			return (
				<View key={index} style={styles.blockquote}>
					<Text>
						<InlineText segments={block.segments} />
					</Text>
				</View>
			);
		case 'list-item':
			return (
				<View key={index} style={styles.listItemRow}>
					<Text style={styles.bullet}>{block.ordered ? `${block.index}.` : '•'}</Text>
					<Text style={styles.listText}>
						<InlineText segments={block.segments} />
					</Text>
				</View>
			);
		case 'code-block':
			return (
				<Text key={index} style={styles.codeBlock}>
					{block.text}
				</Text>
			);
		case 'hr':
			return <View key={index} style={styles.hrSpacer} />;
		default:
			return null;
	}
}

export function DocumentPdfTemplate({
	title,
	content,
	metadata,
}: DocumentPdfTemplateProps): React.ReactElement {
	const blocks = parseMarkdown(content);

	const metaParts: string[] = [];
	if (metadata?.type) metaParts.push(metadata.type);
	if (metadata?.createdAt) {
		metaParts.push(
			new Date(metadata.createdAt).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
			})
		);
	}

	return (
		<Document title={title}>
			<Page size="A4" style={styles.page}>
				<Text style={styles.title}>{title}</Text>
				{metaParts.length > 0 && <Text style={styles.meta}>{metaParts.join(' · ')}</Text>}
				<View style={styles.divider} />
				{blocks.map((block, idx) => (
					<BlockRenderer key={idx} block={block} index={idx} />
				))}
			</Page>
		</Document>
	);
}
