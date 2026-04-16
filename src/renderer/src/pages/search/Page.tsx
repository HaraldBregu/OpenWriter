import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
	PageSubHeader,
} from '@/components/app/base/Page';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { SearchEmptyState, SearchInput, SearchSection } from './components';
import { useSearchQuery, useSearchResults } from './hooks';
import Layout from './Layout';

function PageContent(): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { query, deferredQuery, hasQuery, setQuery, clearQuery } = useSearchQuery();
	const { sections, totalCount } = useSearchResults(deferredQuery);

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>{t('menu.search', 'Search')}</PageHeaderTitle>
				{hasQuery && (
					<p className="text-xs text-muted-foreground">
						{t('search.resultsSummary', {
							count: totalCount,
							query: deferredQuery,
							defaultValue:
								totalCount === 1
									? '1 result for "{{query}}"'
									: '{{count}} results for "{{query}}"',
						})}
					</p>
				)}
			</PageHeader>
			<PageSubHeader>
				<ButtonGroup className="min-w-0 flex-1">
					<SearchInput
						value={query}
						onChange={setQuery}
						onClear={clearQuery}
						placeholder={t('menu.search', 'Search')}
					/>
				</ButtonGroup>
			</PageSubHeader>
			<PageBody>
				{totalCount === 0 ? (
					<SearchEmptyState query={deferredQuery} onClear={clearQuery} />
				) : (
					<div className="grid items-start gap-4 p-6 xl:grid-cols-3">
						{sections.map((section) => (
							<SearchSection
								key={section.id}
								section={section}
								onSelect={(item) => navigate(item.href)}
							/>
						))}
					</div>
				)}
			</PageBody>
		</PageContainer>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
