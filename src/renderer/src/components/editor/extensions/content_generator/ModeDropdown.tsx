import React from 'react';
import { AppButton } from '@components/app/AppButton';
import {
	AppDropdownMenu,
	AppDropdownMenuTrigger,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
} from '@components/app/AppDropdownMenu';
import { ChevronDown, ImagePlus, Type } from 'lucide-react';
import type { ContentGeneratorMode } from './input-extension';

const MODE_OPTIONS: { value: ContentGeneratorMode; label: string; icon: React.ElementType }[] = [
	{ value: 'text', label: 'Generate text', icon: Type },
	{ value: 'image', label: 'Generate image', icon: ImagePlus },
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
	const CurrentIcon = current.icon;

	return (
		<AppDropdownMenu>
			<AppDropdownMenuTrigger asChild>
				<AppButton
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
					disabled={disabled}
				>
					<CurrentIcon className="h-3.5 w-3.5" />
					<span>{current.label}</span>
					<ChevronDown className="h-3 w-3" />
				</AppButton>
			</AppDropdownMenuTrigger>
			<AppDropdownMenuContent align="start" sideOffset={4}>
				{MODE_OPTIONS.map((option) => {
					const Icon = option.icon;
					return (
						<AppDropdownMenuItem key={option.value} onSelect={() => onModeChange(option.value)}>
							<Icon className="mr-2 h-4 w-4" />
							<span>{option.label}</span>
						</AppDropdownMenuItem>
					);
				})}
			</AppDropdownMenuContent>
		</AppDropdownMenu>
	);
}
