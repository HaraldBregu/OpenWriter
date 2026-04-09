import React from 'react';

interface SettingRowProps {
	readonly label: string;
	readonly description?: string;
	readonly labelFor?: string;
	readonly children: React.ReactNode;
}

export const SettingRow: React.FC<SettingRowProps> = ({
	label,
	description,
	labelFor,
	children,
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
