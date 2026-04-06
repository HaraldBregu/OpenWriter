import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchEmptyState, SearchInput, SearchSection } from './components';
import { useSearchQuery, useSearchResults } from './hooks';

const Layout: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { query, deferredQuery, hasQuery, setQuery, clearQuery } = useSearchQuery();
	const { sections, totalCount } = useSearchResults(deferredQuery);

	return (
		<div className="flex min-h-full justify-center px-6 py-10">
			<div className="flex w-full max-w-6xl flex-col gap-6">
				<div className="space-y-1">
					<h1 className="text-2xl font-medium tracking-tight text-foreground">
						{t('menu.search', 'Search')}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t(
							'search.placeholderCopy',
							'Find documents, resources, and app shortcuts from one place.'
						)}
					</p>
				</div>

				<SearchInput
					value={query}
					onChange={setQuery}
					onClear={clearQuery}
					placeholder={t('menu.search', 'Search')}
				/>

				<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
					<p>
						{hasQuery
							? t('search.resultsSummary', {
									count: totalCount,
									query: deferredQuery,
									defaultValue:
										totalCount === 1
											? '1 result for "{{query}}"'
											: '{{count}} results for "{{query}}"',
								})
							: t(
									'search.browseSummary',
									'Browse recent documents, imported resources, and quick actions.'
								)}
					</p>
					{hasQuery && (
						<button
							type="button"
							onClick={clearQuery}
							className="font-medium text-foreground transition-colors hover:text-primary"
						>
							{t('common.clear', 'Clear')}
						</button>
					)}
				</div>

				{totalCount === 0 ? (
					<SearchEmptyState query={deferredQuery} onClear={clearQuery} />
				) : (
					<div className="grid items-start gap-4 xl:grid-cols-3">
						{sections.map((section) => (
							<SearchSection
								key={section.id}
								section={section}
								onSelect={(item) => navigate(item.href)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export { Layout };
