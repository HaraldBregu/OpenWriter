import type { ReactElement } from 'react';
import { ChevronDown, Info, Play } from 'lucide-react';
import { OCR_MODELS } from '../../../../../../shared/models';
import { getProvider } from '../../../../../../shared/providers';
import type { ProviderId } from '../../../../../../shared/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { FileUploadTrigger } from '@/components/ui/FileUpload';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { ImageExtractor } from './ImageExtractor';
import { PdfExtractor } from './PdfExtractor';

export type ExtractorType = 'image' | 'pdf';

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

export const EXTRA_OPTIONS = [
	{ value: 'descrizione', label: 'Descrizione' },
	{ value: 'didascalia', label: 'Didascalia' },
	{ value: 'metadati', label: 'Metadati' },
] as const;

export type ExtraValue = (typeof EXTRA_OPTIONS)[number]['value'];

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

export interface AnalysisPanelProps {
	readonly header: ReactElement;
	readonly title: string;
	readonly hasFile: boolean;
	readonly selectedModel: string;
	readonly onModelChange: (modelId: string) => void;
	readonly selectedExtras: ExtraValue[];
	readonly onToggleExtra: (value: ExtraValue) => void;
	readonly outputFileName: string;
	readonly onOutputFileNameChange: (name: string) => void;
	readonly onCancel: () => void;
	readonly onSubmit: () => void;
	readonly submitLabel?: string;
}

export function AnalysisPanel({
	header,
	title,
	hasFile,
	selectedModel,
	onModelChange,
	selectedExtras,
	onToggleExtra,
	outputFileName,
	onOutputFileNameChange,
	onCancel,
	onSubmit,
	submitLabel = 'Analizza',
}: AnalysisPanelProps): ReactElement {
	const selectedModelEntry = OCR_MODELS.find((m) => m.modelId === selectedModel);

	return (
		<div className="flex h-full flex-col">
			{header}
			<div className="p-4">
				<h2 className="text-sm font-semibold">{title}</h2>
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
								<DropdownMenuRadioGroup value={selectedModel} onValueChange={onModelChange}>
									{Array.from(new Set(OCR_MODELS.map((m) => m.providerId))).map(
										(providerId, idx) => (
											<div key={providerId}>
												{idx > 0 && <DropdownMenuSeparator />}
												{OCR_MODELS.filter((m) => m.providerId === providerId).map((model) => (
													<DropdownMenuRadioItem
														key={model.modelId}
														value={model.modelId}
														className="gap-2"
													>
														<ProviderIcon providerId={model.providerId} />
														{model.name}
													</DropdownMenuRadioItem>
												))}
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
										selectedExtras.includes(option.value) ? 'outline-selected' : 'outline'
									}
									size="xs"
									onClick={() => onToggleExtra(option.value)}
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
				<label className="text-xs font-medium text-muted-foreground">Nome file di output</label>
				<Input
					value={outputFileName}
					onChange={(e) => onOutputFileNameChange(e.target.value)}
					placeholder="Nome file di output"
					className="h-8 text-xs"
				/>
			</div>
			<div className="flex gap-2 border-t p-4">
				<Button variant="outline" className="flex-1" onClick={onCancel}>
					Annulla
				</Button>
				<Button className="flex-1 gap-1.5" disabled={!hasFile || !selectedModel} onClick={onSubmit}>
					<Play className="h-3.5 w-3.5" />
					{submitLabel}
				</Button>
			</div>
		</div>
	);
}

export interface ExtractorHeaderProps {
	readonly icon: ReactElement;
	readonly fileName: string | null;
	readonly placeholder: string;
	readonly changeLabel: string;
}

export function ExtractorHeader({
	icon,
	fileName,
	placeholder,
	changeLabel,
}: ExtractorHeaderProps): ReactElement {
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
	if (type === 'pdf') return <PdfExtractor open={open} onOpenChange={onOpenChange} />;
	return <ImageExtractor open={open} onOpenChange={onOpenChange} />;
}
