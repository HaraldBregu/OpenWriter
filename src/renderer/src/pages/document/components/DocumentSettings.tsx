import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, FolderOpen, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Slider } from '@/components/ui/Slider';

interface DocumentSettingsProps {
	readonly documentId: string | null;
	readonly title: string;
	readonly content: string;
}

export default function DocumentSettings({
	documentId,
}: DocumentSettingsProps): React.ReactElement {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);

	const handleOpenFolder = useCallback(() => {
		if (!documentId) return;
		window.workspace.openDocumentFolder(documentId);
	}, [documentId]);

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						title={t('configSidebar.documentInfo', 'Document info')}
						aria-label={t('configSidebar.documentInfo', 'Document info')}
					>
						<SlidersHorizontal aria-hidden="true" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="truncate text-sm font-medium text-foreground">
						Document settings
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<div className="px-1.5 py-1">
						<div className="mb-1.5 flex items-center justify-between">
							<span className="text-xs font-medium">Width</span>
						</div>
						<Slider defaultValue={[75]} max={100} step={1} className="mx-auto w-full max-w-xs" />
					</div>
					<div className="px-1.5 py-1">
						<div className="mb-1.5 flex items-center justify-between">
							<span className="text-xs font-medium">Text size</span>
						</div>
						<Slider defaultValue={[75]} max={100} step={1} className="mx-auto w-full max-w-xs" />
					</div>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Font</DropdownMenuLabel>
					<DropdownMenuRadioGroup defaultValue="sans">
						<DropdownMenuRadioItem value="sans">
							<span className="font-sans">Sans</span>
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="serif">
							<span className="font-serif">Serif</span>
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="mono">
							<span className="font-mono">Mono</span>
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Theme</DropdownMenuLabel>
					<DropdownMenuRadioGroup defaultValue="light">
						<DropdownMenuRadioItem value="light">
							<Sun className="text-muted-foreground" aria-hidden="true" />
							<span>Light</span>
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="dark">
							<Moon className="text-muted-foreground" aria-hidden="true" />
							<span>Dark</span>
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={handleOpenFolder} disabled={!documentId}>
						<FolderOpen className="text-muted-foreground" aria-hidden="true" />
						<span className="truncate">{t('configSidebar.openFolder', 'Open folder')}</span>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Slider defaultValue={[75]} max={100} step={1} className="mx-auto w-full max-w-xs" />
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
