import { Search } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import { RESOURCE_SECTIONS } from '../../shared/resource-sections';
import { ALL_TYPES_VALUE } from '../types';
import { useContext } from '../hooks/use-context';

export function DataToolbar(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.data;
	const { searchQuery, setSearchQuery, typeFilter, setTypeFilter, mimeTypes } = useDataContext();

	return (
		<div className="flex items-center gap-3">
			<div className="relative flex-1">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder={t(section.searchPlaceholderKey)}
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-9"
				/>
			</div>
			<Select
				value={typeFilter}
				onValueChange={(value) => {
					if (value !== null) setTypeFilter(value);
				}}
			>
				<SelectTrigger className="w-[200px]">
					<SelectValue placeholder={t('library.allTypes')} />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_TYPES_VALUE}>{t('library.allTypes')}</SelectItem>
					{mimeTypes.map((type) => (
						<SelectItem key={type} value={type}>
							{type}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
