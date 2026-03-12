import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileWarning, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import xml from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {
	AppSheet,
	AppSheetContent,
	AppSheetHeader,
	AppSheetTitle,
	AppSheetDescription,
	AppTable,
	AppTableHeader,
	AppTableBody,
	AppTableHead,
	AppTableRow,
	AppTableCell,
} from '../../components/app';
import type { ResourceInfo } from '../../../../shared/types';
import { formatBytes } from './constants';

SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('xml', xml);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('python', python);

const MIME_TO_LANGUAGE: Record<string, string> = {
	'application/json': 'json',
	'application/xml': 'xml',
	'text/css': 'css',
	'text/javascript': 'javascript',
	'text/typescript': 'typescript',
	'text/jsx': 'javascript',
	'text/tsx': 'typescript',
	'text/x-python': 'python',
};

const BINARY_MIME_TYPES = new Set([
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/msword',
	'application/rtf',
]);

function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let current = '';
	let inQuotes = false;
	let row: string[] = [];

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (inQuotes) {
			if (char === '"' && text[i + 1] === '"') {
				current += '"';
				i++;
			} else if (char === '"') {
				inQuotes = false;
			} else {
				current += char;
			}
		} else if (char === '"') {
			inQuotes = true;
		} else if (char === ',') {
			row.push(current);
			current = '';
		} else if (char === '\n' || (char === '\r' && text[i + 1] === '\n')) {
			row.push(current);
			current = '';
			rows.push(row);
			row = [];
			if (char === '\r') i++;
		} else {
			current += char;
		}
	}
	if (current || row.length > 0) {
		row.push(current);
		rows.push(row);
	}
	return rows;
}

function PdfPreview({ path }: { path: string }) {
	const { t } = useTranslation();
	const [dataUrl, setDataUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		window.workspace
			.readFile({ filePath: path, encoding: 'latin1' })
			.then((raw) => {
				if (cancelled) return;
				const bytes = new Uint8Array(raw.length);
				for (let i = 0; i < raw.length; i++) {
					bytes[i] = raw.charCodeAt(i);
				}
				const blob = new Blob([bytes], { type: 'application/pdf' });
				setDataUrl(URL.createObjectURL(blob));
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load PDF');
				}
			});

		return () => {
			cancelled = true;
			setDataUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return null;
			});
		};
	}, [path]);

	if (error) {
		return (
			<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		);
	}

	if (!dataUrl) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				{t('resources.loadingPdf')}
			</div>
		);
	}

	return <iframe title="PDF preview" src={dataUrl} className="h-full w-full border-0" />;
}

function CsvPreview({ content }: { content: string }) {
	const { t } = useTranslation();
	const rows = useMemo(() => parseCsv(content), [content]);
	const [header, ...body] = rows;

	if (rows.length === 0) {
		return <p className="text-sm text-muted-foreground">{t('resources.emptyCsv')}</p>;
	}

	return (
		<div className="rounded-md border overflow-auto">
			<AppTable>
				{header && (
					<AppTableHeader>
						<AppTableRow>
							{header.map((cell, i) => (
								<AppTableHead key={i}>{cell}</AppTableHead>
							))}
						</AppTableRow>
					</AppTableHeader>
				)}
				<AppTableBody>
					{body.map((row, ri) => (
						<AppTableRow key={ri}>
							{row.map((cell, ci) => (
								<AppTableCell key={ci} className="text-sm">
									{cell}
								</AppTableCell>
							))}
						</AppTableRow>
					))}
				</AppTableBody>
			</AppTable>
		</div>
	);
}

function HtmlPreview({ content }: { content: string }) {
	return (
		<iframe
			title="HTML preview"
			srcDoc={content}
			className="h-full w-full border-0 bg-white rounded"
			sandbox="allow-same-origin"
		/>
	);
}

function MarkdownPreview({ content }: { content: string }) {
	return (
		<div className="prose prose-sm dark:prose-invert max-w-none">
			<Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
		</div>
	);
}

function CodePreview({ content, language }: { content: string; language: string }) {
	return (
		<SyntaxHighlighter
			language={language}
			style={vs2015}
			customStyle={{ margin: 0, borderRadius: '0.375rem', fontSize: '0.875rem' }}
			wrapLongLines
		>
			{content}
		</SyntaxHighlighter>
	);
}

function JsonPreview({ content }: { content: string }) {
	const formatted = useMemo(() => {
		try {
			return JSON.stringify(JSON.parse(content), null, 2);
		} catch {
			return content;
		}
	}, [content]);

	return <CodePreview content={formatted} language="json" />;
}

function PlainTextPreview({ content }: { content: string }) {
	return (
		<pre className="whitespace-pre-wrap break-words text-sm font-mono text-foreground">
			{content}
		</pre>
	);
}

function UnsupportedPreview({ mimeType }: { mimeType: string }) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
			<FileWarning className="h-10 w-10" />
			<p className="text-sm">{t('resources.previewNotAvailable', { mimeType })}</p>
		</div>
	);
}

function FileContentView({ doc, content }: { doc: ResourceInfo; content: string | null }) {
	const { mimeType } = doc;

	if (mimeType === 'application/pdf') {
		return <PdfPreview path={doc.path} />;
	}

	if (BINARY_MIME_TYPES.has(mimeType)) {
		return <UnsupportedPreview mimeType={mimeType} />;
	}

	if (content === null) return null;

	if (mimeType === 'text/csv') {
		return <CsvPreview content={content} />;
	}

	if (mimeType === 'text/html') {
		return <HtmlPreview content={content} />;
	}

	if (mimeType === 'text/markdown') {
		return <MarkdownPreview content={content} />;
	}

	if (mimeType === 'application/json') {
		return <JsonPreview content={content} />;
	}

	const language = MIME_TO_LANGUAGE[mimeType];
	if (language) {
		return <CodePreview content={content} language={language} />;
	}

	return <PlainTextPreview content={content} />;
}

interface ResourcePreviewSheetProps {
	doc: ResourceInfo | null;
	onClose: () => void;
}

export function ResourcePreviewSheet({ doc, onClose }: ResourcePreviewSheetProps) {
	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isBinary = doc !== null && BINARY_MIME_TYPES.has(doc.mimeType);

	useEffect(() => {
		if (!doc || isBinary) {
			setContent(null);
			setError(null);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setError(null);
		setContent(null);

		window.workspace
			.readFile({ filePath: doc.path })
			.then((text) => {
				if (!cancelled) setContent(text);
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to read file');
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [doc, isBinary]);

	return (
		<AppSheet
			open={doc !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<AppSheetContent className="sm:max-w-xl flex flex-col">
				<AppSheetHeader>
					<AppSheetTitle className="truncate">{doc?.name}</AppSheetTitle>
					<AppSheetDescription>
						{doc?.mimeType} &middot; {doc ? formatBytes(doc.size) : ''}
					</AppSheetDescription>
				</AppSheetHeader>
				<div className="flex-1 min-h-0 overflow-auto mt-4">
					{loading && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							Loading&hellip;
						</div>
					)}
					{error && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}
					{!loading && !error && doc && <FileContentView doc={doc} content={content} />}
				</div>
			</AppSheetContent>
		</AppSheet>
	);
}
