import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MIME_TYPE_PDF } from '../../shared/resource-preview-utils';
import { useFilesContext } from '../context/FilesContext';

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

function PreviewLoading() {
	return (
		<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
			<Loader2 className="mr-2 h-4 w-4 animate-spin" />
			Loading preview...
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

function PdfPreview({ path }: { path: string }) {
	const { blobUrl, error, loading } = useBlobUrl(path, 'application/pdf');

	if (error) return <PreviewError message={error} />;
	if (loading || !blobUrl) return <PreviewLoading />;

	return <iframe src={blobUrl} className="h-full w-full border-0" title="PDF Preview" />;
}

const EXTRA_OPTIONS = [
	{ value: 'immagine', label: 'Immagine' },
	{ value: 'intestazione', label: 'Intestazione' },
	{ value: 'per-pagina', label: 'Per di pagina' },
] as const;

type ExtraValue = (typeof EXTRA_OPTIONS)[number]['value'];

function SectionHeader({
	label,
	hasInfo = false,
	onAdd,
}: {
	label: string;
	hasInfo?: boolean;
	onAdd?: () => void;
}) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-1">
				<span className="text-xs font-medium text-muted-foreground">{label}</span>
				{hasInfo && <Info className="h-3 w-3 text-muted-foreground/50" />}
			</div>
			{onAdd && (
				<Button variant="ghost" size="xs" onClick={onAdd}>
					Aggiungi
				</Button>
			)}
		</div>
	);
}

export function PdfDialog(): ReactElement | null {
	const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange } = useFilesContext();
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['intestazione']);

	const toggleExtra = (value: ExtraValue) => {
		setSelectedExtras((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
	};

	if (!activeFile || activeFile.mimeType !== MIME_TYPE_PDF) {
		return null;
	}

	return (
		<Dialog open={fileDetailsOpen} onOpenChange={handleFileDetailsOpenChange}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0">
				<DialogHeader className="contents space-y-0 text-left py-0">
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<ResizablePanelGroup orientation="horizontal" className="h-full w-full">
							<ResizablePanel defaultSize={70} minSize="40%">
								<PdfPreview path={activeFile.path} />
							</ResizablePanel>
							<ResizableHandle withHandle />
							<ResizablePanel defaultSize={30} minSize="30%">
								<div className="flex h-full flex-col">
								<ScrollArea className="flex-1">
									<div className="divide-y divide-border">
										<div className="space-y-2 p-4">
											<SectionHeader label="Modello" hasInfo onAdd={() => {}} />
											<Badge variant="secondary">Mistral OCR Latest</Badge>
										</div>

										<div className="space-y-2 p-4">
											<SectionHeader label="Formato della risposta" hasInfo onAdd={() => {}} />
											<p className="text-xs text-muted-foreground">All 0s: '1-4.8'</p>
										</div>

										<div className="space-y-2 p-4">
											<SectionHeader label="Extra tabelle" />
											<p className="text-xs">Markdown autonomo</p>
										</div>

										<div className="space-y-2 p-4">
											<SectionHeader label="Extra" onAdd={() => {}} />
											<div className="flex flex-wrap gap-1.5">
												{EXTRA_OPTIONS.map((option) => (
													<Button
														key={option.value}
														variant={
															selectedExtras.includes(option.value) ? 'outline-selected' : 'outline'
														}
														size="xs"
														onClick={() => toggleExtra(option.value)}
													>
														{option.label}
													</Button>
												))}
											</div>
										</div>

										<div className="flex items-center justify-between p-4">
											<span className="text-xs font-medium text-muted-foreground">
												Aggiungi immagine
											</span>
											<Button variant="ghost" size="xs">
												Aggiungi
											</Button>
										</div>

										<div className="space-y-2 p-4">
											<SectionHeader label="Punteggio di confidenza" />
											<Badge variant="outline">Nessuno</Badge>
										</div>

										<div className="p-4">
											<p className="text-xs text-muted-foreground">
												Funzionalità aggiuntive disponibili tramite{' '}
												<span className="font-medium text-primary">OWR Document AI</span>
											</p>
										</div>
									</div>
								</ScrollArea>
							</ResizablePanel>
						</ResizablePanelGroup>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
