import { Eye } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AppButton,
} from '@/components/app';
import type { ResourceInfo } from '../../../../../../shared/types';
import type { SortKey } from '../types';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useDataContext } from '../context/DataContext';
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
	readonly onPreview: (resource: ResourceInfo) => void;
}

function DataRow({
	resource,
	editing,
	isSelected,
	onToggle,
	onPreview,
}: DataRowProps): ReactElement {
	return (
		<AppTableRow data-state={editing && isSelected ? 'selected' : undefined}>
			{editing && (
				<AppTableCell className="w-[40px]">
					<AppCheckbox checked={isSelected} onCheckedChange={() => onToggle(resource.id)} />
				</AppTableCell>
			)}
			<AppTableCell className="max-w-[300px] truncate font-medium">
				{resource.name}
			</AppTableCell>
			<AppTableCell className="text-muted-foreground">{resource.mimeType}</AppTableCell>
			<AppTableCell className="text-right tabular-nums text-muted-foreground">
				{formatBytes(resource.size)}
			</AppTableCell>
			<AppTableCell className="text-muted-foreground">
				{formatDate(resource.importedAt)}
			</AppTableCell>
			<AppTableCell className="text-muted-foreground">
				{formatDate(resource.lastModified)}
			</AppTableCell>
			<AppTableCell>
				<AppButton
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={() => onPreview(resource)}
				>
					<Eye className="h-4 w-4" />
				</AppButton>
			</AppTableCell>
		</AppTableRow>
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
		setPreviewResource,
	} = useDataContext();

	return (
		<div className="flex-1 min-h-0 overflow-auto rounded-md border">
			<AppTable>
				<AppTableHeader sticky>
					<AppTableRow>
						{editing && (
							<AppTableHead className="w-[40px]">
								<AppCheckbox
									checked={someChecked ? undefined : allChecked}
									indeterminate={someChecked}
									onCheckedChange={handleToggleAll}
								/>
							</AppTableHead>
						)}
						{SORT_COLUMNS.map(({ key, labelKey, headClassName }) => (
							<AppTableHead key={key} className={headClassName}>
								<button
									type="button"
									className="inline-flex items-center transition-colors hover:text-foreground"
									onClick={() => handleSort(key)}
								>
									{t(labelKey)}
									<SortIcon active={sortKey === key} direction={sortDirection} />
								</button>
							</AppTableHead>
						))}
						<AppTableHead className="w-[50px]" />
					</AppTableRow>
				</AppTableHeader>
				<AppTableBody>
					{filteredResources.map((resource) => (
						<DataRow
							key={resource.id}
							resource={resource}
							editing={editing}
							isSelected={selected.has(resource.id)}
							onToggle={handleToggleRow}
							onPreview={setPreviewResource}
						/>
					))}
				</AppTableBody>
			</AppTable>
		</div>
	);
}
