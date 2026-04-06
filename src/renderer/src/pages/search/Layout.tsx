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
		<div className="flex min-h-full justify-start px-6 py-10">
			<div className="flex h-full w-full max-w-6xl flex-col gap-6">
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

				<div className="sticky top-10 z-20 w-full rounded-3xl border border-border/50 bg-background/80 p-5 backdrop-blur">
					<SearchInput
						value={query}
						onChange={setQuery}
						onClear={clearQuery}
						placeholder={t('menu.search', 'Search')}
					/>
					<div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
						<p className="max-w-3xl text-foreground/80">
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
				</div>

				<div className="flex flex-1 min-h-0 flex-col overflow-hidden">
					{totalCount === 0 ? (
						<div className="flex h-full w-full">
							<SearchEmptyState query={deferredQuery} onClear={clearQuery} />
						</div>
					) : (
						<div className="flex h-full flex-col overflow-y-auto pt-4">
							<div className="grid items-start gap-4 xl:grid-cols-3">
								{sections.map((section) => (
									<SearchSection
										key={section.id}
										section={section}
										onSelect={(item) => navigate(item.href)}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export { Layout };
