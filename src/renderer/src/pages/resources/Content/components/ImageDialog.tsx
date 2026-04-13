import { useState } from 'react';
import type { ReactElement } from 'react';
import { ChevronDown, ImageIcon, Info, Play, X } from 'lucide-react';
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
	{ value: 'descrizione', label: 'Descrizione' },
	{ value: 'didascalia', label: 'Didascalia' },
	{ value: 'metadati', label: 'Metadati' },
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

interface ImageDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function ImageDialog({ open, onOpenChange }: ImageDialogProps): ReactElement {
	const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['descrizione']);
	const [outputFileName, setOutputFileName] = useState('');
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [imageName, setImageName] = useState<string | null>(null);

	const selectedModelEntry = OCR_MODELS.find((m) => m.modelId === selectedModel);

	const handleModelChange = (modelId: string): void => {
		setSelectedModel(modelId);
	};

	const toggleExtra = (value: ExtraValue) => {
		setSelectedExtras((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
	};

	const handleSelectImage = async () => {
		try {
			const result = await window.workspace.selectFile(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);
			if (!result) return;

			const base64 = await window.workspace.readFileBinary(result.path);
			const blob = new Blob(
				[Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))],
				{ type: `image/${result.name.split('.').pop()?.toLowerCase() ?? 'png'}` }
			);
			const url = URL.createObjectURL(blob);

			if (imageSrc) URL.revokeObjectURL(imageSrc);
			setImageSrc(url);
			setImageName(result.name);
			if (!outputFileName) {
				setOutputFileName(result.name.replace(/\.[^.]+$/, ''));
			}
		} catch {
			// picker cancelled
		}
	};

	const handleClose = (nextOpen: boolean) => {
		if (!nextOpen && imageSrc) {
			URL.revokeObjectURL(imageSrc);
			setImageSrc(null);
			setImageName(null);
		}
		onOpenChange(nextOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col py-0 p-0">
				<DialogHeader className="contents space-y-0 text-left py-0">
					<DialogDescription render={<div />} className="flex min-h-0 flex-1">
						<ResizablePanelGroup orientation="horizontal" className="h-full w-full">
							<ResizablePanel defaultSize={70} minSize="40%" className="rounded-l-xl">
								{imageSrc ? (
									<div className="flex h-full w-full items-center justify-center bg-muted/30 p-8">
										<img
											src={imageSrc}
											alt={imageName ?? 'Preview'}
											className="max-h-full max-w-full rounded object-contain"
										/>
									</div>
								) : (
									<div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-muted/30">
										<div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
											<ImageIcon className="h-8 w-8 text-muted-foreground" />
										</div>
										<p className="text-sm text-muted-foreground">Nessuna immagine selezionata</p>
										<Button variant="outline" onClick={handleSelectImage}>
											Seleziona immagine
										</Button>
									</div>
								)}
							</ResizablePanel>
							<ResizableHandle withHandle />
							<ResizablePanel defaultSize={30} minSize="30%">
								<div className="flex h-full flex-col">
									<div className="border-b p-4">
										<div className="flex items-start gap-3">
											<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
												<ImageIcon className="h-5 w-5 text-muted-foreground" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold">
													{imageName ?? 'Immagine'}
												</p>
												{imageName && (
													<div className="mt-1 flex items-center gap-2">
														<Button
															variant="ghost"
															size="xs"
															className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground"
															onClick={handleSelectImage}
														>
															Cambia immagine
														</Button>
													</div>
												)}
											</div>
										</div>
									</div>
									<div className="p-4">
										<h2 className="text-sm font-semibold">Impostazioni analisi</h2>
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
															<ProviderIcon providerId={selectedModelEntry.providerId} />
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
															{Array.from(new Set(OCR_MODELS.map((m) => m.providerId))).map(
																(providerId, idx) => (
																	<div key={providerId}>
																		{idx > 0 && <DropdownMenuSeparator />}
																		{OCR_MODELS.filter((m) => m.providerId === providerId).map(
																			(model) => (
																				<DropdownMenuRadioItem
																					key={model.modelId}
																					value={model.modelId}
																					className="gap-2"
																				>
																					<ProviderIcon providerId={model.providerId} />
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
											onClick={() => handleClose(false)}
										>
											Annulla
										</Button>
										<Button
											className="flex-1 gap-1.5"
											disabled={!imageSrc || !selectedModel}
											onClick={() => {
												// Placeholder for image analysis submission
											}}
										>
											<Play className="h-3.5 w-3.5" />
											Analizza
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
