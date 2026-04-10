import { Eye } from 'lucide-react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
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
		<TableRow data-state={editing && isSelected ? 'selected' : undefined}>
			{editing && (
				<TableCell className="w-10">
					<Checkbox checked={isSelected} onCheckedChange={() => onToggle(resource.id)} />
				</TableCell>
			)}
			<TableCell className="max-w-[300px] truncate font-medium">{resource.name}</TableCell>
			<TableCell className="text-muted-foreground">{resource.mimeType}</TableCell>
			<TableCell className="text-right tabular-nums text-muted-foreground">
				{formatBytes(resource.size)}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{formatDate(resource.importedAt)}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{formatDate(resource.lastModified)}
			</TableCell>
			<TableCell>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={() => onPreview(resource)}
				>
					<Eye className="h-4 w-4" />
				</Button>
			</TableCell>
		</TableRow>
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
			<Table>
				<TableHeader className="bg-muted sticky top-0 z-10">
					<TableRow>
						{editing && (
							<TableHead className="w-10">
								<Checkbox
									checked={someChecked ? undefined : allChecked}
									indeterminate={someChecked}
									onCheckedChange={handleToggleAll}
									aria-label="Select all"
								/>
							</TableHead>
						)}
						{SORT_COLUMNS.map(({ key, labelKey, headClassName, buttonClassName }) => (
							<TableHead key={key} className={headClassName}>
								<button
									type="button"
									className={`inline-flex items-center transition-colors hover:text-foreground ${buttonClassName ?? ''}`}
									onClick={() => handleSort(key)}
								>
									{t(labelKey)}
									<SortIcon active={sortKey === key} direction={sortDirection} />
								</button>
							</TableHead>
						))}
						<TableHead className="w-[50px]" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredResources.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={editing ? 7 : 6}
								className="px-4 py-8 text-center text-sm text-muted-foreground"
							>
								No resources match your search.
							</TableCell>
						</TableRow>
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
				</TableBody>
			</Table>
		</div>
	);
}
