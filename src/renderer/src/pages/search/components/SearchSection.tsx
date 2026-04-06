import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEARCH_SECTION_ICONS } from '../constants';
import type { SearchResultItem, SearchResultSection } from '../types';
import { SearchResultCard } from './SearchResultCard';

interface SearchSectionProps {
	section: SearchResultSection;
	onSelect: (item: SearchResultItem) => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ section, onSelect }) => {
	const { t } = useTranslation();
	const Icon = SEARCH_SECTION_ICONS[section.id];

	return (
		<section className="flex flex-col rounded-3xl border border-border bg-card/70 p-5">
			<div className="mb-4 flex items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
					<Icon className="h-4 w-4" />
				</div>
				<div className="min-w-0">
					<h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-foreground/90">
						{t(`search.section.${section.id}.title`, section.title)}
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				{section.items.length > 0 ? (
					section.items.map((item) => (
						<SearchResultCard key={item.id} item={item} onSelect={onSelect} />
					))
				) : (
					<div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-5 text-sm text-muted-foreground">
						{section.emptyCopy}
					</div>
				)}
			</div>
		</section>
	);
};

export { SearchSection };
