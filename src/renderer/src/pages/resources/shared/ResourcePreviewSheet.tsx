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
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/Sheet';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import type { ResourceInfo } from '../../../../../shared/types';
import { formatBytes } from './resource-utils';

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

	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		if (inQuotes) {
			if (char === '"' && text[i + 1] === '"') {
				current += '"';
				i += 1;
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
			if (char === '\r') i += 1;
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

function useBlobUrl(path: string, mimeType: string) {
	const [blobUrl, setBlobUrl] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		let objectUrl: string | null = null;

		setLoading(true);
		setError(null);
		setBlobUrl(null);

		window.workspace
			.readFile({ filePath: path, encoding: 'latin1' })
			.then((raw) => {
				if (cancelled) return;
				const bytes = new Uint8Array(raw.length);
				for (let i = 0; i < raw.length; i += 1) {
					bytes[i] = raw.charCodeAt(i);
				}
				const blob = new Blob([bytes], { type: mimeType });
				objectUrl = URL.createObjectURL(blob);
				setBlobUrl(objectUrl);
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load preview');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [mimeType, path]);

	return { blobUrl, error, loading };
}

function ImagePreview({ path, mimeType }: { path: string; mimeType: string }) {
	const { blobUrl, error, loading } = useBlobUrl(path, mimeType);
	const { t } = useTranslation();

	if (error) {
		return (
			<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		);
	}

	if (loading || !blobUrl) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				{t('library.loadingPreview')}
			</div>
		);
	}

	return (
		<div className="flex h-full items-center justify-center rounded-md border bg-muted/20 p-4">
			<img src={blobUrl} alt="" className="max-h-full max-w-full rounded object-contain" />
		</div>
	);
}

function PdfPreview({ path }: { path: string }) {
	const { blobUrl, error, loading } = useBlobUrl(path, 'application/pdf');
	const { t } = useTranslation();

	if (error) {
		return (
			<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		);
	}

	if (loading || !blobUrl) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				{t('library.loadingPdf')}
			</div>
		);
	}

	return <iframe title="PDF preview" src={blobUrl} className="h-full w-full border-0" />;
}

function CsvPreview({ content }: { content: string }) {
	const { t } = useTranslation();
	const rows = useMemo(() => parseCsv(content), [content]);
	const [header, ...body] = rows;

	if (rows.length === 0) {
		return <p className="text-sm text-muted-foreground">{t('library.emptyCsv')}</p>;
	}

	return (
		<div className="overflow-auto rounded-md border">
			<AppTable>
				{header && (
					<AppTableHeader>
						<AppTableRow>
							{header.map((cell, index) => (
								<AppTableHead key={index}>{cell}</AppTableHead>
							))}
						</AppTableRow>
					</AppTableHeader>
				)}
				<AppTableBody>
					{body.map((row, rowIndex) => (
						<AppTableRow key={rowIndex}>
							{row.map((cell, cellIndex) => (
								<AppTableCell key={cellIndex} className="text-sm">
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
			className="h-full w-full rounded border-0 bg-white"
			sandbox="allow-same-origin"
		/>
	);
}

function MarkdownPreview({ content }: { content: string }) {
	return (
		<div className="prose prose-sm max-w-none dark:prose-invert">
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
		<pre className="whitespace-pre-wrap break-words font-mono text-sm text-foreground">
			{content}
		</pre>
	);
}

function UnsupportedPreview({ mimeType }: { mimeType: string }) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
			<FileWarning className="h-10 w-10" />
			<p className="text-sm">{t('library.previewNotAvailable', { mimeType })}</p>
		</div>
	);
}

function FileContentView({
	resource,
	content,
}: {
	resource: ResourceInfo;
	content: string | null;
}) {
	if (resource.mimeType.startsWith('image/')) {
		return <ImagePreview path={resource.path} mimeType={resource.mimeType} />;
	}

	if (resource.mimeType === 'application/pdf') {
		return <PdfPreview path={resource.path} />;
	}

	if (BINARY_MIME_TYPES.has(resource.mimeType)) {
		return <UnsupportedPreview mimeType={resource.mimeType} />;
	}

	if (content === null) {
		return null;
	}

	if (resource.mimeType === 'text/csv') {
		return <CsvPreview content={content} />;
	}

	if (resource.mimeType === 'text/html') {
		return <HtmlPreview content={content} />;
	}

	if (resource.mimeType === 'text/markdown') {
		return <MarkdownPreview content={content} />;
	}

	if (resource.mimeType === 'application/json') {
		return <JsonPreview content={content} />;
	}

	const language = MIME_TO_LANGUAGE[resource.mimeType];
	if (language) {
		return <CodePreview content={content} language={language} />;
	}

	return <PlainTextPreview content={content} />;
}

interface ResourcePreviewSheetProps {
	readonly resource: ResourceInfo | null;
	readonly onClose: () => void;
}

export function ResourcePreviewSheet({ resource, onClose }: ResourcePreviewSheetProps) {
	const { t } = useTranslation();
	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isBinary =
		resource !== null &&
		(BINARY_MIME_TYPES.has(resource.mimeType) ||
			resource.mimeType === 'application/pdf' ||
			resource.mimeType.startsWith('image/'));

	useEffect(() => {
		if (!resource || isBinary) {
			setContent(null);
			setError(null);
			setLoading(false);
			return;
		}

		let cancelled = false;

		setLoading(true);
		setError(null);
		setContent(null);

		window.workspace
			.readFile({ filePath: resource.path })
			.then((text) => {
				if (!cancelled) {
					setContent(text);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to read file');
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [isBinary, resource]);

	return (
		<AppSheet
			open={resource !== null}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<AppSheetContent className="flex flex-col sm:max-w-xl">
				<AppSheetHeader>
					<AppSheetTitle className="truncate">{resource?.name}</AppSheetTitle>
					<AppSheetDescription>
						{resource?.mimeType} &middot; {resource ? formatBytes(resource.size) : ''}
					</AppSheetDescription>
				</AppSheetHeader>
				<div className="mt-4 flex-1 min-h-0 overflow-auto">
					{loading && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="h-4 w-4 animate-spin" />
							{t('library.loadingPreview')}
						</div>
					)}
					{error && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
							{error}
						</div>
					)}
					{!loading && !error && resource && (
						<FileContentView resource={resource} content={content} />
					)}
				</div>
			</AppSheetContent>
		</AppSheet>
	);
}
