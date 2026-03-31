import React from 'react';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuTrigger,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
} from '@components/app/AppDropdownMenu';
import { ChevronDown } from 'lucide-react';
import type { ContentGeneratorMode } from './input-extension';

const MODE_OPTIONS: {
	value: ContentGeneratorMode;
	label: string;
	menuLabel: string;
}[] = [
	{ value: 'text', label: 'Text', menuLabel: 'Generate Text' },
	{ value: 'image', label: 'Image', menuLabel: 'Generate Image' },
];

interface ModeDropdownProps {
	mode: ContentGeneratorMode;
	disabled: boolean;
	onModeChange: (mode: ContentGeneratorMode) => void;
}

export function ModeDropdown({
	mode,
	disabled,
	onModeChange,
}: ModeDropdownProps): React.JSX.Element {
	const current = MODE_OPTIONS.find((o) => o.value === mode) ?? MODE_OPTIONS[0];

	return (
		<AppDropdownMenu>
			<AppDropdownMenuTrigger asChild>
				<AppButton
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground"
					disabled={disabled}
				>
					<span>{current.label}</span>
					<ChevronDown className="h-3 w-3" />
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent align="start" sideOffset={4}>
				{MODE_OPTIONS.map((option) => (
					<AppDropdownMenuItem key={option.value} onSelect={() => onModeChange(option.value)}>
						<span>{option.menuLabel}</span>
					</AppDropdownMenuItem>
				))}
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
}
