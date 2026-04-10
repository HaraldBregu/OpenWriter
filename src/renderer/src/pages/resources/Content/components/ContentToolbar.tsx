import { Search } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { useContentContext } from '../context/ContentContext';

export function ContentToolbar(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.content;
	const { searchQuery, setSearchQuery } = useContentContext();

	return (
		<div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
			<div className="relative flex-1">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={t(section.searchPlaceholderKey)}
					className={cn(
						'h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm',
						'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
					)}
				/>
			</div>
		</div>
	);
}
