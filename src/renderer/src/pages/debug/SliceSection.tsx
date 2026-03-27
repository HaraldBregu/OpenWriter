import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import type { SliceName } from './debug-constants';
import { entryCount } from './debug-helpers';

export function SliceSection({ name, data }: { name: SliceName; data: unknown }) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const json = JSON.stringify(data, null, 2);

	const handleCopy = useCallback(() => {
		navigator.clipboard.writeText(json);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}, [json]);

	return (
		<div className="border rounded-lg overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
			>
				{open ? (
					<ChevronDown className="h-4 w-4 shrink-0" />
				) : (
					<ChevronRight className="h-4 w-4 shrink-0" />
				)}
				<span className="text-sm font-medium">{name}</span>
				<span className="text-xs text-muted-foreground ml-auto">{entryCount(data)}</span>
			</button>

			{open && (
				<div className="border-t relative">
					<button
						type="button"
						onClick={handleCopy}
						title={t('debug.copyToClipboard')}
						className="absolute top-2 right-2 p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground"
					>
						{copied ? (
							<Check className="h-3.5 w-3.5 text-success" />
						) : (
							<Copy className="h-3.5 w-3.5" />
						)}
					</button>
					<pre className="p-4 pr-10 text-xs font-mono overflow-auto max-h-96 bg-muted/20 text-muted-foreground whitespace-pre-wrap break-all">
						{json}
					</pre>
				</div>
			)}
		</div>
	);
}
