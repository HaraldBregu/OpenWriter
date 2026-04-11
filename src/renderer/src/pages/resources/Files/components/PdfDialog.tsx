import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import { ChevronDown, FileText, Info, Play } from 'lucide-react';
import { OCR_MODELS } from '../../../../../../shared/models';
import { getProvider } from '../../../../../../shared/providers';
import type { ProviderId } from '../../../../../../shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MIME_TYPE_PDF } from '../../shared/resource-preview-utils';
import { useFilesContext } from '../context/FilesContext';

const PROVIDER_COLORS: Record<string, string> = {
	openai: 'bg-green-600',
	anthropic: 'bg-amber-700',
	google: 'bg-blue-600',
	meta: 'bg-blue-500',
	mistral: 'bg-orange-500',
	amazon: 'bg-yellow-600',
};

function ProviderIcon({ providerId }: { providerId: ProviderId }) {
	const bg = PROVIDER_COLORS[providerId] ?? 'bg-zinc-500';
	const name = getProvider(providerId)?.name ?? providerId;
	return (
		<span
			className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold leading-none text-white ${bg}`}
		>
			{name.charAt(0)}
		</span>
	);
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

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

function formatFileSize(bytes: number): string {
	if (bytes < BYTES_PER_KB) return `${bytes} B`;
	if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
	return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
	const dotIndex = name.lastIndexOf('.');
	return dotIndex >= 0 ? name.slice(dotIndex + 1).toUpperCase() : '';
}

function getFileNameWithoutExtension(name: string): string {
	const dotIndex = name.lastIndexOf('.');
	return dotIndex >= 0 ? name.slice(0, dotIndex) : name;
}

export function PdfDialog(): ReactElement | null {
	const { activeFile, fileDetailsOpen, handleFileDetailsOpenChange } = useFilesContext();
	const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');

	useEffect(() => {
		window.workspace.getOcrModelId().then((modelId) => {
			setSelectedModel(modelId);
		});
	}, []);

	const handleModelChange = (modelId: string): void => {
		setSelectedModel(modelId);
		window.workspace.setOcrModelId(modelId);
	};

	const selectedModelEntry = OCR_MODELS.find((m) => m.modelId === selectedModel);
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['intestazione']);
	const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
	const [outputFileName, setOutputFileName] = useState(
		activeFile ? getFileNameWithoutExtension(activeFile.name) : ''
	);

	useEffect(() => {
		if (activeFile?.name) {
			setOutputFileName(getFileNameWithoutExtension(activeFile.name));
		}
	}, [activeFile?.name]);

	useEffect(() => {
		if (!activeFile?.path || activeFile.mimeType !== MIME_TYPE_PDF) {
			setPdfBlobUrl(null);
			return;
		}

		let objectUrl: string | null = null;
		let cancelled = false;

		window.workspace.readFileBinary(activeFile.path).then((base64: string) => {
			if (cancelled) return;
			const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
			const blob = new Blob([bytes], { type: 'application/pdf' });
			objectUrl = URL.createObjectURL(blob);
			setPdfBlobUrl(objectUrl);
		});

		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [activeFile?.path, activeFile?.mimeType]);

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
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0 p-0">
				<DialogHeader className="contents space-y-0 text-left py-0">
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<ResizablePanelGroup orientation="horizontal" className="h-full w-full">
							<ResizablePanel defaultSize={70} minSize="40%" className="rounded-l-xl">
								{pdfBlobUrl && (
									<PDFViewer
										className="h-full w-full"
										config={{
											src: pdfBlobUrl,
											disabledCategories: [
												'annotation',
												'annotation-highlight',
												'annotation-markup',
												'print',
												'redaction',
												'zoom',
												'document-print',
												'export',
												'document-export',
												'annotation',
												'redaction',
												'tools',
												'selection',
												'history',
											],
											theme: {
												preference: 'system',
											},
										}}
									/>
								)}
							</ResizablePanel>
							<ResizableHandle withHandle />
							<ResizablePanel defaultSize={30} minSize="30%">
								<div className="flex h-full flex-col">
									<div className="border-b p-4">
										<div className="flex items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
												<FileText className="h-5 w-5 text-muted-foreground" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold">{activeFile.name}</p>
												<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
													<span>{getFileExtension(activeFile.name)}</span>
													<span>{formatFileSize(activeFile.size)}</span>
													<span>{new Date(activeFile.modifiedAt).toLocaleDateString()}</span>
												</div>
											</div>
										</div>
									</div>
									<div className="p-4">
										<h2 className="text-sm font-semibold">Impostazioni OCR</h2>
									</div>
									<ScrollArea className="flex-1">
										<div className="divide-y divide-border">
											<div className="flex items-center justify-between gap-4 p-4">
												<div>
													<p className="text-xs font-medium">Modello</p>
													<p className="text-[11px] text-muted-foreground">
														{selectedModelEntry
															? (getProvider(selectedModelEntry.providerId)?.name ??
																selectedModelEntry.providerId)
															: 'AI'}
													</p>
												</div>
												<DropdownMenu>
													<DropdownMenuTrigger
														render={<Button variant="outline" />}
														className="h-8 min-w-40 shrink-0 gap-2 text-xs font-normal"
													>
														{selectedModelEntry && (
															<ProviderIcon provider={selectedModelEntry.provider} />
														)}
														<span className="truncate">
															{selectedModelEntry?.name ?? 'Seleziona modello'}
														</span>
														<ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
													</DropdownMenuTrigger>
													<DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
														<DropdownMenuRadioGroup
															value={selectedModel}
															onValueChange={handleModelChange}
														>
															{Array.from(new Set(OCR_MODELS.map((m) => m.provider))).map(
																(provider, idx) => (
																	<div key={provider}>
																		{idx > 0 && <DropdownMenuSeparator />}
																		{OCR_MODELS.filter((m) => m.provider === provider).map(
																			(model) => (
																				<DropdownMenuRadioItem
																					key={model.modelId}
																					value={model.modelId}
																					className="gap-2"
																				>
																					<ProviderIcon provider={model.provider} />
																					{model.name}
																				</DropdownMenuRadioItem>
																			)
																		)}
																	</div>
																)
															)}
														</DropdownMenuRadioGroup>
													</DropdownMenuContent>
												</DropdownMenu>
											</div>

											<div className="space-y-2 p-4">
												<SectionHeader label="Formato della risposta" hasInfo onAdd={() => {}} />
												<p className="text-xs text-muted-foreground">All 0s: 1 2 3</p>
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
																selectedExtras.includes(option.value)
																	? 'outline-selected'
																	: 'outline'
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
									<div className="space-y-1.5 border-t px-4 pt-3 pb-2">
										<label className="text-xs font-medium text-muted-foreground">
											Nome file di output
										</label>
										<Input
											value={outputFileName}
											onChange={(e) => setOutputFileName(e.target.value)}
											placeholder="Nome file di output"
											className="h-8 text-xs"
										/>
									</div>
									<div className="flex gap-2 border-t p-4">
										<Button
											variant="outline"
											className="flex-1"
											onClick={() => handleFileDetailsOpenChange(false)}
										>
											Annulla
										</Button>
										<Button
											className="flex-1 gap-1.5"
											onClick={async () => {
												if (activeFile?.path && selectedModel) {
													const result = await window.task.submit('ocr', {
														url: activeFile.path,
														modelId: selectedModel,
														inputType: 'url',
													});
													if (!result.success) {
														console.error('[PdfDialog] OCR submit failed:', result.error.message);
													}
												}
											}}
										>
											<Play className="h-3.5 w-3.5" />
											Esegui OCR
										</Button>
									</div>
								</div>
							</ResizablePanel>
						</ResizablePanelGroup>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
