import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sun, Monitor, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '../../../contexts';

interface ThemeOption {
	readonly value: ThemeMode;
	readonly icon: React.ElementType;
	readonly labelKey: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
	{ value: 'light', icon: Sun, labelKey: 'settings.theme.light' },
	{ value: 'system', icon: Monitor, labelKey: 'settings.theme.system' },
	{ value: 'dark', icon: Moon, labelKey: 'settings.theme.dark' },
] as const;

interface ThemeSegmentControlProps {
	readonly value: ThemeMode;
	readonly onChange: (next: ThemeMode) => void;
	readonly groupLabel: string;
}

export const ThemeSegmentControl: React.FC<ThemeSegmentControlProps> = ({
	value,
	onChange,
	groupLabel,
}) => {
	const { t } = useTranslation();

	return (
		<div
			role="group"
			aria-label={groupLabel}
			className="inline-flex rounded-md border border-border bg-muted p-0.5"
		>
			{THEME_OPTIONS.map((option, index) => {
				const isActive = value === option.value;
				const Icon = option.icon;
				const isFirst = index === 0;
				const isLast = index === THEME_OPTIONS.length - 1;

				return (
					<button
						key={option.value}
						type="button"
						aria-pressed={isActive}
						aria-label={t(option.labelKey)}
						onClick={() => onChange(option.value)}
						className={cn(
							'relative p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
							isFirst && 'rounded-l-sm',
							isLast && 'rounded-r-sm',
							!isFirst && !isLast && 'rounded-none',
							isActive
								? 'bg-background text-foreground shadow-sm'
								: 'bg-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						<Icon size={16} />
					</button>
				);
			})}
		</div>
	);
};
