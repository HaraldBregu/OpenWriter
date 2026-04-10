import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import { ChevronDown, Info } from 'lucide-react';
import { OCR_MODELS } from '../../../../../../shared/models';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/Dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MIME_TYPE_PDF } from '../../shared/resource-preview-utils';
import { useFilesContext } from '../context/FilesContext';

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
	const [selectedModel, setSelectedModel] = useState<string | null>(OCR_MODELS[0]?.modelId ?? null);
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['intestazione']);
	const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

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
									<div className=" p-4">
										<h2 className="text-sm font-semibold">Impostazioni OCR</h2>
									</div>
									<ScrollArea className="flex-1">
										<div className="divide-y divide-border">
											<div className="space-y-2 p-4">
												<SectionHeader label="Modello" hasInfo />
												<Select value={selectedModel} onValueChange={setSelectedModel}>
													<SelectTrigger className="h-8 text-xs" aria-label="Modello OCR">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{OCR_MODELS.map((model) => (
															<SelectItem key={model.modelId} value={model.modelId}>
																{model.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
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
									<div className="space-y-2 border-t p-4">
										<Button className="w-full">Esegui OCR</Button>
										<Button
											variant="outline"
											className="w-full"
											onClick={() => handleFileDetailsOpenChange(false)}
										>
											Chiudi
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
