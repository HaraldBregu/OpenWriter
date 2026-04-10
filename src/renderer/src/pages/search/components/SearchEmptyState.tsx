import React from 'react';
import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

interface SearchEmptyStateProps {
	query: string;
	onClear: () => void;
}

const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({ query, onClear }) => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 p-10">
			<div className="flex max-w-md flex-col items-center gap-4 text-center">
				<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
					<SearchX className="h-6 w-6" />
				</div>
				<div className="space-y-2">
					<h2 className="text-lg font-semibold tracking-tight text-foreground">
						{t('search.emptyTitle', 'No matches yet')}
					</h2>
					<p className="text-sm text-muted-foreground">
						{t('search.emptyDescription', {
							query,
							defaultValue: 'Nothing matched "{{query}}". Try a title, path, or section name.',
						})}
					</p>
				</div>
				<Button variant="outline" onClick={onClear}>
					{t('common.clear', 'Clear')}
				</Button>
			</div>
		</div>
	);
};

export { SearchEmptyState };
