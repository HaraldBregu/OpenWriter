import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Search } from 'lucide-react';
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
import { Input } from '@/components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/Select';
import type { ResourceInfo } from '../../../../../shared/types';
import { formatBytes, formatDate } from './resource-utils';

const ResourcePreviewSheet = lazy(() =>
	import('./ResourcePreviewSheet').then((module) => ({ default: module.ResourcePreviewSheet }))
);

const ALL_TYPES_VALUE = 'all';

type SortKey = 'name' | 'mimeType' | 'size' | 'importedAt' | 'lastModified';
type SortDirection = 'none' | 'asc' | 'desc';

const COLUMN_KEYS: { key: SortKey; i18nKey: string; className?: string }[] = [
	{ key: 'name', i18nKey: 'library.name' },
	{ key: 'mimeType', i18nKey: 'library.type' },
	{ key: 'size', i18nKey: 'library.size', className: 'text-right' },
	{ key: 'importedAt', i18nKey: 'library.imported' },
	{ key: 'lastModified', i18nKey: 'library.lastModified' },
];

function compareResources(
	left: ResourceInfo,
	right: ResourceInfo,
	key: SortKey,
	direction: SortDirection
): number {
	let result: number;
	if (key === 'name' || key === 'mimeType') {
		result = left[key].localeCompare(right[key]);
	} else {
		result = left[key] - right[key];
	}

	return direction === 'asc' ? result : -result;
}

function SortIcon({
	column,
	sortKey,
	sortDirection,
}: {
	column: SortKey;
	sortKey: SortKey;
	sortDirection: SortDirection;
}) {
	if (column !== sortKey || sortDirection === 'none') {
		return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" />;
	}

	if (sortDirection === 'asc') {
		return <ArrowUp className="ml-1 inline h-3.5 w-3.5" />;
	}

	return <ArrowDown className="ml-1 inline h-3.5 w-3.5" />;
}

interface ResourceRowProps {
	readonly resource: ResourceInfo;
	readonly editing: boolean;
	readonly isSelected: boolean;
	readonly onToggle: (id: string) => void;
	readonly onPreview: (resource: ResourceInfo) => void;
}

const ResourceRow = memo(function ResourceRow({
	resource,
	editing,
	isSelected,
	onToggle,
	onPreview,
}: ResourceRowProps) {
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
			<TableCell className="text-muted-foreground">
				{formatDate(resource.importedAt)}
			</TableCell>
			<TableCell className="text-muted-foreground">
				{formatDate(resource.lastModified)}
			</TableCell>
			<TableCell>
				<AppButton
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={() => onPreview(resource)}
				>
					<Eye className="h-4 w-4" />
				</AppButton>
			</TableCell>
		</TableRow>
	);
});

interface ResourceTableProps {
	readonly resources: ResourceInfo[];
	readonly searchPlaceholder: string;
	readonly editing: boolean;
	readonly selected: Set<string>;
	readonly onSelectedChange: (selected: Set<string>) => void;
}

export const ResourceTable = memo(function ResourceTable({
	resources,
	searchPlaceholder,
	editing,
	selected,
	onSelectedChange,
}: ResourceTableProps) {
	const { t } = useTranslation();
	const [search, setSearch] = useState('');
	const [typeFilter, setTypeFilter] = useState(ALL_TYPES_VALUE);
	const [sortKey, setSortKey] = useState<SortKey>('name');
	const [sortDirection, setSortDirection] = useState<SortDirection>('none');
	const [previewResource, setPreviewResource] = useState<ResourceInfo | null>(null);

	const handleSort = useCallback(
		(key: SortKey) => {
			if (key === sortKey) {
				setSortDirection((current) => {
					if (current === 'none') return 'asc';
					if (current === 'asc') return 'desc';
					return 'none';
				});
				return;
			}

			setSortKey(key);
			setSortDirection('asc');
		},
		[sortKey]
	);

	const mimeTypes = useMemo(() => {
		const types = new Set(resources.map((resource) => resource.mimeType));
		return Array.from(types).sort();
	}, [resources]);

	const filteredResources = useMemo(() => {
		const normalizedQuery = search.toLowerCase().trim();
		const nextResources = resources.filter((resource) => {
			if (typeFilter !== ALL_TYPES_VALUE && resource.mimeType !== typeFilter) {
				return false;
			}

			if (normalizedQuery && !resource.name.toLowerCase().includes(normalizedQuery)) {
				return false;
			}

			return true;
		});

		if (sortDirection !== 'none') {
			nextResources.sort((left, right) => compareResources(left, right, sortKey, sortDirection));
		}

		return nextResources;
	}, [resources, search, sortDirection, sortKey, typeFilter]);

	const allChecked =
		filteredResources.length > 0 &&
		filteredResources.every((resource) => selected.has(resource.id));
	const someChecked =
		!allChecked && filteredResources.some((resource) => selected.has(resource.id));

	const toggleAll = useCallback(() => {
		const nextSelected = new Set(selected);

		if (allChecked) {
			for (const resource of filteredResources) {
				nextSelected.delete(resource.id);
			}
		} else {
			for (const resource of filteredResources) {
				nextSelected.add(resource.id);
			}
		}

		onSelectedChange(nextSelected);
	}, [allChecked, filteredResources, onSelectedChange, selected]);

	const toggleOne = useCallback(
		(id: string) => {
			const nextSelected = new Set(selected);
			if (nextSelected.has(id)) {
				nextSelected.delete(id);
			} else {
				nextSelected.add(id);
			}
			onSelectedChange(nextSelected);
		},
		[onSelectedChange, selected]
	);

	return (
		<div className="flex flex-1 min-h-0 flex-col gap-3">
			<div className="flex items-center gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={searchPlaceholder}
						value={search}
						onChange={(event) => setSearch(event.target.value)}
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
			<div className="flex-1 min-h-0 overflow-auto rounded-md border">
				<AppTable>
					<AppTableHeader sticky>
						<TableRow>
							{editing && (
								<AppTableHead className="w-[40px]">
									<Checkbox
										checked={someChecked ? undefined : allChecked}
										indeterminate={someChecked}
										onCheckedChange={toggleAll}
									/>
								</AppTableHead>
							)}
							{COLUMN_KEYS.map((column) => (
								<AppTableHead key={column.key} className={column.className}>
									<button
										type="button"
										className="inline-flex items-center transition-colors hover:text-foreground"
										onClick={() => handleSort(column.key)}
									>
										{t(column.i18nKey)}
										<SortIcon column={column.key} sortKey={sortKey} sortDirection={sortDirection} />
									</button>
								</AppTableHead>
							))}
							<AppTableHead className="w-[50px]" />
						</TableRow>
					</AppTableHeader>
					<AppTableBody>
						{filteredResources.map((resource) => (
							<ResourceRow
								key={resource.id}
								resource={resource}
								editing={editing}
								isSelected={selected.has(resource.id)}
								onToggle={toggleOne}
								onPreview={setPreviewResource}
							/>
						))}
					</AppTableBody>
				</AppTable>
			</div>

			{previewResource && (
				<Suspense fallback={null}>
					<ResourcePreviewSheet
						resource={previewResource}
						onClose={() => setPreviewResource(null)}
					/>
				</Suspense>
			)}
		</div>
	);
});
