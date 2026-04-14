import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { ChevronDown, FileText, ImageIcon, Info, Play } from 'lucide-react';
import { OCR_MODELS } from '../../../../../../shared/models';
import { getProvider } from '../../../../../../shared/providers';
import type { ProviderId } from '../../../../../../shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/Empty';
import { FileUpload, FileUploadDropzone, FileUploadTrigger } from '@/components/ui/FileUpload';
import { Image } from '@/components/image/Image';
import { Input } from '@/components/ui/Input';
import { Pdf } from '@/components/pdf/Pdf';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/Resizable';
import { ScrollArea } from '@/components/ui/ScrollArea';

export type ExtractorType = 'image' | 'pdf';

const EXTRA_OPTIONS = [
	{ value: 'descrizione', label: 'Descrizione' },
	{ value: 'didascalia', label: 'Didascalia' },
	{ value: 'metadati', label: 'Metadati' },
] as const;

type ExtraValue = (typeof EXTRA_OPTIONS)[number]['value'];

const PROVIDER_COLORS: Record<string, string> = {
	openai: 'bg-green-600',
	anthropic: 'bg-amber-700',
	google: 'bg-blue-600',
	meta: 'bg-blue-500',
	mistral: 'bg-orange-500',
	amazon: 'bg-yellow-600',
};

interface TypeConfig {
	readonly accept: string;
	readonly icon: ReactElement;
	readonly placeholder: string;
	readonly changeLabel: string;
	readonly title: string;
	readonly submitLabel: string;
	readonly emptyTitle: string;
	readonly emptyDescription: string;
	readonly selectLabel: string;
}

const TYPE_CONFIG: Record<ExtractorType, TypeConfig> = {
	image: {
		accept: 'image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml',
		icon: <ImageIcon className="h-5 w-5 text-muted-foreground" />,
		placeholder: 'Immagine',
		changeLabel: 'Cambia immagine',
		title: 'Impostazioni analisi',
		submitLabel: 'Analizza',
		emptyTitle: 'Nessuna immagine selezionata',
		emptyDescription: "Trascina un'immagine qui o",
		selectLabel: 'Seleziona immagine',
	},
	pdf: {
		accept: 'application/pdf',
		icon: <FileText className="h-5 w-5 text-muted-foreground" />,
		placeholder: 'PDF',
		changeLabel: 'Cambia PDF',
		title: 'Impostazioni OCR',
		submitLabel: 'Esegui OCR',
		emptyTitle: 'Nessun PDF selezionato',
		emptyDescription: 'Trascina un PDF qui o',
		selectLabel: 'Seleziona PDF',
	},
};

function ProviderIcon({ providerId }: { providerId: ProviderId }): ReactElement {
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

function SectionHeader({
	label,
	hasInfo = false,
	onAdd,
}: {
	label: string;
	hasInfo?: boolean;
	onAdd?: () => void;
}): ReactElement {
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

function PreviewArea({
	type,
	fileSrc,
	fileName,
	config,
}: {
	type: ExtractorType;
	fileSrc: string | null;
	fileName: string | null;
	config: TypeConfig;
}): ReactElement {
	if (!fileSrc) {
		return (
			<FileUploadDropzone className="flex h-full w-full items-center justify-center rounded-none border-0 bg-muted/30 p-8 hover:bg-muted/40">
				<Empty className="border-0 p-0">
					<EmptyHeader>
						<EmptyMedia variant="icon" className="size-16 rounded-full">
							{type === 'image' ? (
								<ImageIcon className="size-8 text-muted-foreground" />
							) : (
								<FileText className="size-8 text-muted-foreground" />
							)}
						</EmptyMedia>
						<EmptyTitle>{config.emptyTitle}</EmptyTitle>
						<EmptyDescription>{config.emptyDescription}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<FileUploadTrigger render={<Button variant="outline">{config.selectLabel}</Button>} />
					</EmptyContent>
				</Empty>
			</FileUploadDropzone>
		);
	}
	if (type === 'image') {
		return (
			<div className="flex h-full w-full items-center justify-center bg-muted/30 p-8">
				<Image
					src={fileSrc}
					alt={fileName ?? 'Preview'}
					className="max-h-full max-w-full object-contain"
					cardClassName="max-h-full max-w-full overflow-hidden"
				/>
			</div>
		);
	}
	return <Pdf src={fileSrc} className="h-full w-full" />;
}

function AnalysisHeader({
	icon,
	fileName,
	placeholder,
	changeLabel,
}: {
	icon: ReactNode;
	fileName: string | null;
	placeholder: string;
	changeLabel: string;
}): ReactElement {
	return (
		<div className="border-b p-4">
			<div className="flex items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
					{icon}
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold">{fileName ?? placeholder}</p>
					{fileName && (
						<div className="mt-1 flex items-center gap-2">
							<FileUploadTrigger
								render={
									<Button
										variant="ghost"
										size="xs"
										className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground"
									>
										{changeLabel}
									</Button>
								}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

interface ExtractorDialogProps {
	readonly type: ExtractorType;
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function ExtractorDialog({ type, open, onOpenChange }: ExtractorDialogProps): ReactElement {
	const [selectedModel, setSelectedModel] = useState(OCR_MODELS[0]?.modelId ?? '');
	const [selectedExtras, setSelectedExtras] = useState<ExtraValue[]>(['descrizione']);
	const [outputFileName, setOutputFileName] = useState('');
	const [fileSrc, setFileSrc] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);

	const config = TYPE_CONFIG[type];
	const selectedModelEntry = OCR_MODELS.find((m) => m.modelId === selectedModel);

	const toggleExtra = (value: ExtraValue): void => {
		setSelectedExtras((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
	};

	const handleFileAccept = (file: File): void => {
		const url = URL.createObjectURL(file);
		if (fileSrc) URL.revokeObjectURL(fileSrc);
		setFileSrc(url);
		setFileName(file.name);
		if (!outputFileName) {
			setOutputFileName(file.name.replace(/\.[^.]+$/, ''));
		}
	};

	const handleClose = (nextOpen: boolean): void => {
		if (!nextOpen && fileSrc) {
			URL.revokeObjectURL(fileSrc);
			setFileSrc(null);
			setFileName(null);
		}
		onOpenChange(nextOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="flex h-[calc(100vh-16rem)] min-w-[calc(100vw-18rem)] flex-col py-0 p-0">
				<FileUpload
					accept={config.accept}
					onFileAccept={handleFileAccept}
					className="flex min-h-0 w-full flex-1"
				>
					<ResizablePanelGroup orientation="horizontal" className="h-full w-full">
						<ResizablePanel defaultSize={70} minSize="40%" className="relative rounded-l-xl">
							<PreviewArea type={type} fileSrc={fileSrc} fileName={fileName} config={config} />
						</ResizablePanel>
						<ResizableHandle withHandle />
						<ResizablePanel defaultSize={30} minSize="30%">
							<div className="flex h-full flex-col">
								<AnalysisHeader
									icon={config.icon}
									fileName={fileName}
									placeholder={config.placeholder}
									changeLabel={config.changeLabel}
								/>
								<div className="p-4">
									<h2 className="text-sm font-semibold">{config.title}</h2>
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
														onValueChange={setSelectedModel}
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
									<Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
										Annulla
									</Button>
									<Button
										className="flex-1 gap-1.5"
										disabled={!fileSrc || !selectedModel}
										onClick={() => {
											// Placeholder for submission
										}}
									>
										<Play className="h-3.5 w-3.5" />
										{config.submitLabel}
									</Button>
								</div>
							</div>
						</ResizablePanel>
					</ResizablePanelGroup>
				</FileUpload>
			</DialogContent>
		</Dialog>
	);
}
