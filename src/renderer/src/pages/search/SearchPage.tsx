import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AppInput } from '@/components/app';

const SearchPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex h-full min-h-0 items-center justify-center px-6 py-10">
			<div className="w-full max-w-2xl rounded-2xl border border-border bg-card/95 p-6 shadow-sm backdrop-blur">
				<div className="mb-6 space-y-1">
					<h1 className="text-2xl font-medium tracking-tight text-foreground">
						{t('menu.search', 'Search')}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t('search.placeholderCopy', 'Find documents, resources, and more.')}
					</p>
				</div>

				<div className="relative">
					<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<AppInput
						autoFocus
						type="search"
						placeholder={t('menu.search', 'Search')}
						className="h-12 rounded-xl border-border bg-background/80 pl-11 text-sm"
					/>
				</div>
			</div>
		</div>
	);
};

export default SearchPage;
