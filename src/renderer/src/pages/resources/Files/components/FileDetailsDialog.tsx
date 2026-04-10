import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Calendar, File, FileWarning, FolderOpen, HardDrive, Loader2, Trash2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
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
import { Button } from '@/components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import type { FileEntry } from '../../../../../../shared/types';
import { MIME_PREFIX_IMAGE, MIME_TYPE_PDF } from '../types';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useFilesContext } from '../context/FilesContext';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.min.mjs',
	import.meta.url,
).toString();

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
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/msword',
	'application/rtf',
]);

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

function PreviewLoading() {
	return (
		<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
			<Loader2 className="mr-2 h-4 w-4 animate-spin" />
			Loading preview…
		</div>
	);
}

function PreviewError({ message }: { message: string }) {
	return (
		<div className="flex h-full items-center justify-center">
			<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
				{message}
			</div>
		</div>
	);
}

function ImagePreview({ path, mimeType }: { path: string; mimeType: string }) {
	const { blobUrl, error, loading } = useBlobUrl(path, mimeType);

	if (error) return <PreviewError message={error} />;
	if (loading || !blobUrl) return <PreviewLoading />;

	return (
		<div className="flex h-full items-center justify-center rounded-md bg-muted/20 p-4">
			<img src={blobUrl} alt="" className="max-h-full max-w-full rounded object-contain" />
		</div>
	);
}

function PdfPreview({ path }: { path: string }) {
	const { blobUrl, error, loading } = useBlobUrl(path, 'application/pdf');
	const [numPages, setNumPages] = useState<number>(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState<number>(600);

	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				setContainerWidth(entry.contentRect.width);
			}
		});
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, []);

	if (error) return <PreviewError message={error} />;
	if (loading || !blobUrl) return <PreviewLoading />;

	return (
		<div ref={containerRef} className="flex flex-col items-center gap-4">
			<Document
				file={blobUrl}
				onLoadSuccess={({ numPages: n }) => setNumPages(n)}
				loading={<PreviewLoading />}
				error={<PreviewError message="Failed to load PDF" />}
			>
				{Array.from({ length: numPages }, (_, i) => (
					<Page
						key={i + 1}
						pageNumber={i + 1}
						width={containerWidth - 32}
						className="mb-4 shadow-md"
					/>
				))}
			</Document>
		</div>
	);
}

function CsvPreview({ content }: { content: string }) {
	const rows = useMemo(() => parseCsv(content), [content]);
	const [header, ...body] = rows;

	if (rows.length === 0) {
		return <p className="text-sm text-muted-foreground">Empty CSV file</p>;
	}

	return (
		<div className="overflow-auto rounded-md border">
			<Table>
				{header && (
					<TableHeader>
						<TableRow>
							{header.map((cell, index) => (
								<TableHead key={index}>{cell}</TableHead>
							))}
						</TableRow>
					</TableHeader>
				)}
				<TableBody>
					{body.map((row, rowIndex) => (
						<TableRow key={rowIndex}>
							{row.map((cell, cellIndex) => (
								<TableCell key={cellIndex} className="text-sm">
									{cell}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
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
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
			<FileWarning className="h-10 w-10" />
			<p className="text-sm">Preview not available for {mimeType}</p>
		</div>
	);
}

function FilePreview({ file, content }: { file: FileEntry; content: string | null }) {
	if (file.mimeType.startsWith(MIME_PREFIX_IMAGE)) {
		return <ImagePreview path={file.path} mimeType={file.mimeType} />;
	}
	if (file.mimeType === MIME_TYPE_PDF) {
		return <PdfPreview path={file.path} />;
	}
	if (BINARY_MIME_TYPES.has(file.mimeType)) {
		return <UnsupportedPreview mimeType={file.mimeType} />;
	}
	if (content === null) return null;
	if (file.mimeType === 'text/csv') return <CsvPreview content={content} />;
	if (file.mimeType === 'text/html') return <HtmlPreview content={content} />;
	if (file.mimeType === 'text/markdown') return <MarkdownPreview content={content} />;
	if (file.mimeType === 'application/json') return <JsonPreview content={content} />;

	const language = MIME_TO_LANGUAGE[file.mimeType];
	if (language) return <CodePreview content={content} language={language} />;

	return <PlainTextPreview content={content} />;
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
	return (
		<div className="flex items-start gap-3">
			<span className="mt-0.5 text-muted-foreground">{icon}</span>
			<div className="min-w-0 flex-1">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p className="truncate text-sm">{value}</p>
			</div>
		</div>
	);
}

export function FileDetailsDialog(): ReactElement | null {
	const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange, handleOpenFolder } =
		useFilesContext();

	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isBinary =
		activeFile !== null &&
		(BINARY_MIME_TYPES.has(activeFile.mimeType) ||
			activeFile.mimeType === MIME_TYPE_PDF ||
			activeFile.mimeType.startsWith(MIME_PREFIX_IMAGE));

	useEffect(() => {
		if (!activeFile || isBinary) {
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
			.readFile({ filePath: activeFile.path })
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
	}, [activeFile, isBinary]);

	const handleDeleteSingle = useCallback(async () => {
		if (!activeFile) return;
		try {
			await window.workspace.deleteFileEntry(activeFile.id);
			handleFileDetailsOpenChange(false);
		} catch (err) {
			console.error('Failed to delete file:', err);
		}
	}, [activeFile, handleFileDetailsOpenChange]);

	if (!activeFile) {
		return null;
	}

	return (
		<Dialog open={fileDetailsOpen} onOpenChange={handleFileDetailsOpenChange}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col">
				<DialogHeader className="contents space-y-0 text-left">
					<DialogTitle className="truncate">{activeFile.name}</DialogTitle>
					<DialogDescription className="flex min-h-0 flex-1">
						<div className="flex w-full gap-0">
							{/* Left column — file preview */}
							<div className="flex min-h-0 flex-1 flex-col border-r">
								<ScrollArea className="flex-1 p-4">
									{loading && <PreviewLoading />}
									{error && <PreviewError message={error} />}
									{!loading && !error && <FilePreview file={activeFile} content={content} />}
								</ScrollArea>
							</div>

							{/* Right column — details & actions */}
							<div className="flex w-72 shrink-0 flex-col">
								<ScrollArea className="flex-1">
									<div className="space-y-4 p-4">
										<div>
											<h3 className="mb-3 text-sm font-semibold">Details</h3>
											<div className="space-y-3">
												<DetailRow
													icon={<HardDrive className="h-4 w-4" />}
													label="Size"
													value={formatBytes(activeFile.size)}
												/>
												<DetailRow
													icon={<File className="h-4 w-4" />}
													label="Type"
													value={activeFile.mimeType}
												/>
												<DetailRow
													icon={<Calendar className="h-4 w-4" />}
													label="Added"
													value={formatDate(activeFile.createdAt)}
												/>
												<DetailRow
													icon={<Calendar className="h-4 w-4" />}
													label="Modified"
													value={formatDate(activeFile.modifiedAt)}
												/>
											</div>
										</div>

										<Separator />

										<div>
											<h3 className="mb-3 text-sm font-semibold">Location</h3>
											<p
												className="break-all text-xs text-muted-foreground"
												title={activeFile.path}
											>
												{activeFile.relativePath}
											</p>
										</div>

										<Separator />

										<div>
											<h3 className="mb-3 text-sm font-semibold">Actions</h3>
											<div className="space-y-2">
												<Button
													variant="outline"
													className="w-full justify-start"
													onClick={handleOpenFolder}
												>
													<FolderOpen className="mr-2 h-4 w-4" />
													Open in Folder
												</Button>
												<Button
													variant="outline"
													className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
													onClick={() => void handleDeleteSingle()}
												>
													<Trash2 className="mr-2 h-4 w-4" />
													Delete File
												</Button>
											</div>
										</div>
									</div>
								</ScrollArea>
							</div>
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
