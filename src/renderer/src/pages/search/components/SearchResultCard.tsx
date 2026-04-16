import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEARCH_RESULT_KIND_LABELS } from '../constants';
import type { SearchResultItem } from '../types';

interface SearchResultCardProps {
	readonly item: SearchResultItem;
	readonly onSelect: (item: SearchResultItem) => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ item, onSelect }) => {
	const { t } = useTranslation();
	const Icon = item.icon;

	return (
		<button
			type="button"
			onClick={() => onSelect(item)}
			className="group flex w-full items-start gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3 text-left transition-colors hover:border-foreground/15 hover:bg-muted/40"
		>
			<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
				<Icon className="h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex items-center gap-2">
					<p className="truncate text-sm font-medium text-foreground">{item.title}</p>
					<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
						{t(`search.kind.${item.kind}`, SEARCH_RESULT_KIND_LABELS[item.kind] ?? item.kind)}
					</span>
				</div>
				<p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
				<p className="truncate text-[11px] uppercase tracking-[0.12em] text-muted-foreground/80">
					{item.meta}
				</p>
			</div>
			<ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
		</button>
	);
};

export { SearchResultCard };
