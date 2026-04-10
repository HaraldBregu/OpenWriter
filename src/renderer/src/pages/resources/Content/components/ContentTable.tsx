import { Eye } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AppButton,
	AppCheckbox,
	AppTable,
	AppTableBody,
	AppTableCell,
	AppTableHead,
	AppTableHeader,
	AppTableRow,
} from '@/components/app';
import type { ResourceInfo } from '../../../../../../shared/types';
import type { SortKey } from '../types';
import { formatBytes, formatDate } from '../../shared/resource-utils';
import { useContentContext } from '../context/ContentContext';
import { SortIcon } from './SortIcon';

const SORT_COLUMNS: {
	key: SortKey;
	labelKey: string;
	headClassName?: string;
	buttonClassName?: string;
}[] = [
	{ key: 'name', labelKey: 'library.name' },
	{ key: 'mimeType', labelKey: 'library.type' },
	{
		key: 'size',
		labelKey: 'library.size',
		headClassName: 'text-right',
		buttonClassName: 'justify-end w-full',
	},
	{ key: 'importedAt', labelKey: 'library.imported' },
	{ key: 'lastModified', labelKey: 'library.lastModified' },
];

interface ContentRowProps {
	readonly resource: ResourceInfo;
	readonly editing: boolean;
	readonly isSelected: boolean;
	readonly onToggle: (id: string) => void;
	readonly onPreview: (resource: ResourceInfo) => void;
}

function ContentRow({
	resource,
	editing,
	isSelected,
	onToggle,
	onPreview,
}: ContentRowProps): ReactElement {
	return (
		<AppTableRow data-state={editing && isSelected ? 'selected' : undefined}>
			{editing && (
				<AppTableCell className="w-10">
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

export function ContentTable(): ReactElement {
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
	} = useContentContext();

	return (
		<div className="flex-1 min-h-0 overflow-auto rounded-md border">
			<AppTable>
				<AppTableHeader sticky>
					<AppTableRow>
						{editing && (
							<AppTableHead className="w-10">
								<AppCheckbox
									checked={someChecked ? undefined : allChecked}
									indeterminate={someChecked}
									onCheckedChange={handleToggleAll}
									aria-label="Select all"
								/>
							</AppTableHead>
						)}
						{SORT_COLUMNS.map(({ key, labelKey, headClassName, buttonClassName }) => (
							<AppTableHead key={key} className={headClassName}>
								<button
									type="button"
									className={`inline-flex items-center transition-colors hover:text-foreground ${buttonClassName ?? ''}`}
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
					{filteredResources.length === 0 ? (
						<AppTableRow>
							<AppTableCell
								colSpan={editing ? 7 : 6}
								className="px-4 py-8 text-center text-sm text-muted-foreground"
							>
								No resources match your search.
							</AppTableCell>
						</AppTableRow>
					) : (
						filteredResources.map((resource) => (
							<ContentRow
								key={resource.id}
								resource={resource}
								editing={editing}
								isSelected={selected.has(resource.id)}
								onToggle={handleToggleRow}
								onPreview={setPreviewResource}
							/>
						))
					)}
				</AppTableBody>
			</AppTable>
		</div>
	);
}
