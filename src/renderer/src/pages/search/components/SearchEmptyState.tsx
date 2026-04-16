import React from 'react';
import { SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

interface SearchEmptyStateProps {
	readonly query: string;
	readonly onClear: () => void;
}

const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({ query, onClear }) => {
	const { t } = useTranslation();

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
				<SearchX className="h-7 w-7 text-muted-foreground" />
			</div>
			<div className="space-y-1">
				<p className="font-medium text-sm">
					{t('search.emptyTitle', 'No matches yet')}
				</p>
				{query.trim().length > 0 && (
					<p className="text-sm text-muted-foreground">
						{t('search.emptyDescription', {
							query,
							defaultValue: 'Nothing matched "{{query}}". Try a title, path, or section name.',
						})}
					</p>
				)}
			</div>
			{query.trim().length > 0 && (
				<Button variant="outline" size="sm" onClick={onClear}>
					{t('common.clear', 'Clear')}
				</Button>
			)}
		</div>
	);
};

export { SearchEmptyState };
