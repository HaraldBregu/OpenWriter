import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/Checkbox';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/Table';
import type { ResourceInfo } from '../../../../../../shared/types';
import type { SortKey } from '../types';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useContext } from '../hooks/use-context';
import { SortIcon } from './SortIcon';

const SORT_COLUMNS: { key: SortKey; labelKey: string; headClassName?: string }[] = [
	{ key: 'name', labelKey: 'library.name' },
	{ key: 'mimeType', labelKey: 'library.type' },
	{ key: 'size', labelKey: 'library.size', headClassName: 'text-right' },
	{ key: 'importedAt', labelKey: 'library.imported' },
	{ key: 'lastModified', labelKey: 'library.lastModified' },
];

interface DataRowProps {
	readonly resource: ResourceInfo;
	readonly editing: boolean;
	readonly isSelected: boolean;
	readonly onToggle: (id: string) => void;
}

function DataRow({ resource, editing, isSelected, onToggle }: DataRowProps): ReactElement {
	return (
		<TableRow data-state={editing && isSelected ? 'selected' : undefined}>
			{editing && (
				<TableCell className="w-[40px]">
					<Checkbox checked={isSelected} onCheckedChange={() => onToggle(resource.id)} />
				</TableCell>
			)}
			<TableCell className="max-w-[300px] truncate font-medium">{resource.name}</TableCell>
			<TableCell className="text-muted-foreground">{resource.mimeType}</TableCell>
			<TableCell className="text-right tabular-nums text-muted-foreground">
				{formatBytes(resource.size)}
			</TableCell>
			<TableCell className="text-muted-foreground">{formatDate(resource.importedAt)}</TableCell>
			<TableCell className="text-muted-foreground">{formatDate(resource.lastModified)}</TableCell>
		</TableRow>
	);
}

export function DataTable(): ReactElement {
	const { t } = useTranslation();
	const {
		filteredResources,
		editing,
		selected,
		allChecked,
		someChecked,
		sortKey,
		sortDirection,
		handleSort,
		handleToggleAll,
		handleToggleRow,
	} = useContext();

	return (
		<div className="flex-1 min-h-0 overflow-auto rounded-md border">
			<Table>
				<TableHeader className="bg-muted sticky top-0 z-10">
					<TableRow>
						{editing && (
							<TableHead className="w-[40px]">
								<Checkbox
									checked={someChecked ? undefined : allChecked}
									indeterminate={someChecked}
									onCheckedChange={handleToggleAll}
								/>
							</TableHead>
						)}
						{SORT_COLUMNS.map(({ key, labelKey, headClassName }) => (
							<TableHead key={key} className={headClassName}>
								<button
									type="button"
									className="inline-flex items-center transition-colors hover:text-foreground"
									onClick={() => handleSort(key)}
								>
									{t(labelKey)}
									<SortIcon active={sortKey === key} direction={sortDirection} />
								</button>
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredResources.map((resource) => (
						<DataRow
							key={resource.id}
							resource={resource}
							editing={editing}
							isSelected={selected.has(resource.id)}
							onToggle={handleToggleRow}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
