import React from 'react';

// ---------------------------------------------------------------------------
// Section header — small muted text used as a visual divider
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
	readonly title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
	<div className="pt-6 pb-2 first:pt-0">
		<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h2>
	</div>
);

// ---------------------------------------------------------------------------
// Setting row — label + description on the left, action/value on the right
// ---------------------------------------------------------------------------

interface SettingRowProps {
	readonly label: string;
	readonly description?: string;
	readonly children: React.ReactNode;
	/** When the child control is an input, pass its `id` here so the label is programmatically associated. */
	readonly labelFor?: string;
}

export const SettingRow: React.FC<SettingRowProps> = ({
	label,
	description,
	children,
	labelFor,
}) => (
	<div className="flex items-center justify-between py-3 border-b last:border-b-0">
		<div className="min-w-0 mr-4">
			{labelFor ? (
				<label htmlFor={labelFor} className="text-sm">
					{label}
				</label>
			) : (
				<p className="text-sm">{label}</p>
			)}
			{description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
		</div>
		<div className="min-w-0">{children}</div>
	</div>
);
