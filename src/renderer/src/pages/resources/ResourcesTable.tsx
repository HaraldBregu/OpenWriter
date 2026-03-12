import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Search } from 'lucide-react';
import {
	AppButton,
	AppCheckbox,
	AppTable,
	AppTableHeader,
	AppTableBody,
	AppTableHead,
	AppTableRow,
	AppTableCell,
} from '../../components/app';
import { Input } from '../../components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../../components/ui/Select';
import type { ResourceInfo } from '../../../../shared/types';
import { formatBytes, formatDate } from './constants';

const ResourcePreviewSheet = lazy(() =>
	import('./ResourcePreviewSheet').then((m) => ({ default: m.ResourcePreviewSheet }))
);

const ALL_TYPES_VALUE = 'all';

type SortKey = 'name' | 'mimeType' | 'size' | 'importedAt' | 'lastModified';
type SortDirection = 'none' | 'asc' | 'desc';

const COLUMN_KEYS: { key: SortKey; i18nKey: string; className?: string }[] = [
	{ key: 'name', i18nKey: 'resources.name' },
	{ key: 'mimeType', i18nKey: 'resources.type' },
	{ key: 'size', i18nKey: 'resources.size', className: 'text-right' },
	{ key: 'importedAt', i18nKey: 'resources.imported' },
	{ key: 'lastModified', i18nKey: 'resources.lastModified' },
];

function compareDocs(a: ResourceInfo, b: ResourceInfo, key: SortKey, dir: SortDirection): number {
	let result: number;
	if (key === 'name' || key === 'mimeType') {
		result = a[key].localeCompare(b[key]);
	} else {
		result = a[key] - b[key];
	}
	return dir === 'asc' ? result : -result;
}

function SortIcon({
	column,
	sortKey,
	sortDir,
}: {
	column: SortKey;
	sortKey: SortKey;
	sortDir: SortDirection;
}) {
	if (column !== sortKey || sortDir === 'none')
		return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/50" />;
	if (sortDir === 'asc') return <ArrowUp className="ml-1 inline h-3.5 w-3.5" />;
	return <ArrowDown className="ml-1 inline h-3.5 w-3.5" />;
}

interface ResourceRowProps {
	doc: ResourceInfo;
	editing: boolean;
	isSelected: boolean;
	onToggle: (id: string) => void;
	onPreview: (doc: ResourceInfo) => void;
}

const ResourceRow = memo(function ResourceRow({
	doc,
	editing,
	isSelected,
	onToggle,
	onPreview,
}: ResourceRowProps) {
	return (
		<AppTableRow data-state={editing && isSelected ? 'selected' : undefined}>
			{editing && (
				<AppTableCell className="w-[40px]">
					<AppCheckbox checked={isSelected} onCheckedChange={() => onToggle(doc.id)} />
				</AppTableCell>
			)}
			<AppTableCell className="font-medium truncate max-w-[300px]">{doc.name}</AppTableCell>
			<AppTableCell className="text-muted-foreground">{doc.mimeType}</AppTableCell>
			<AppTableCell className="text-right text-muted-foreground tabular-nums">
				{formatBytes(doc.size)}
			</AppTableCell>
			<AppTableCell className="text-muted-foreground">{formatDate(doc.importedAt)}</AppTableCell>
			<AppTableCell className="text-muted-foreground">{formatDate(doc.lastModified)}</AppTableCell>
			<AppTableCell>
				<AppButton
					type="button"
					variant="ghost"
					size="icon"
					className="h-7 w-7"
					onClick={() => onPreview(doc)}
				>
					<Eye className="h-4 w-4" />
				</AppButton>
			</AppTableCell>
		</AppTableRow>
	);
});

interface ResourcesTableProps {
	documents: ResourceInfo[];
	editing: boolean;
	selected: Set<string>;
	onSelectedChange: (selected: Set<string>) => void;
}

export const ResourcesTable = memo(function ResourcesTable({
	documents,
	editing,
	selected,
	onSelectedChange,
}: ResourcesTableProps) {
	const [search, setSearch] = useState('');
	const [typeFilter, setTypeFilter] = useState(ALL_TYPES_VALUE);
	const [sortKey, setSortKey] = useState<SortKey>('name');
	const [sortDir, setSortDir] = useState<SortDirection>('none');
	const [previewDoc, setPreviewDoc] = useState<ResourceInfo | null>(null);

	const handleSort = useCallback(
		(key: SortKey) => {
			if (key === sortKey) {
				setSortDir((prev) => {
					if (prev === 'none') return 'asc';
					if (prev === 'asc') return 'desc';
					return 'none';
				});
			} else {
				setSortKey(key);
				setSortDir('asc');
			}
		},
		[sortKey]
	);

	const mimeTypes = useMemo(() => {
		const types = new Set(documents.map((d) => d.mimeType));
		return Array.from(types).sort();
	}, [documents]);

	const filtered = useMemo(() => {
		const query = search.toLowerCase().trim();
		const result = documents.filter((doc) => {
			if (typeFilter !== ALL_TYPES_VALUE && doc.mimeType !== typeFilter) return false;
			if (query && !doc.name.toLowerCase().includes(query)) return false;
			return true;
		});
		if (sortDir !== 'none') {
			result.sort((a, b) => compareDocs(a, b, sortKey, sortDir));
		}
		return result;
	}, [documents, search, typeFilter, sortKey, sortDir]);

	const allChecked = filtered.length > 0 && filtered.every((d) => selected.has(d.id));
	const someChecked = !allChecked && filtered.some((d) => selected.has(d.id));

	const toggleAll = useCallback(() => {
		const next = new Set(selected);
		if (allChecked) {
			for (const doc of filtered) next.delete(doc.id);
		} else {
			for (const doc of filtered) next.add(doc.id);
		}
		onSelectedChange(next);
	}, [allChecked, filtered, selected, onSelectedChange]);

	const toggleOne = useCallback(
		(id: string) => {
			const next = new Set(selected);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			onSelectedChange(next);
		},
		[selected, onSelectedChange]
	);

	return (
		<div className="flex flex-1 min-h-0 flex-col gap-3">
			<div className="flex items-center gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search resources..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={typeFilter} onValueChange={setTypeFilter}>
					<SelectTrigger className="w-[200px]">
						<SelectValue placeholder="All types" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_TYPES_VALUE}>All types</SelectItem>
						{mimeTypes.map((type) => (
							<SelectItem key={type} value={type}>
								{type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="rounded-md border flex-1 min-h-0 overflow-auto">
				<AppTable>
					<AppTableHeader className="sticky top-0 z-10 bg-muted">
						<AppTableRow>
							{editing && (
								<AppTableHead className="w-[40px]">
									<AppCheckbox
										checked={someChecked ? 'indeterminate' : allChecked}
										onCheckedChange={toggleAll}
									/>
								</AppTableHead>
							)}
							{COLUMNS.map((col) => (
								<AppTableHead key={col.key} className={col.className}>
									<button
										type="button"
										className="inline-flex items-center hover:text-foreground transition-colors"
										onClick={() => handleSort(col.key)}
									>
										{col.label}
										<SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />
									</button>
								</AppTableHead>
							))}
							<AppTableHead className="w-[50px]" />
						</AppTableRow>
					</AppTableHeader>
					<AppTableBody>
						{filtered.map((doc) => (
							<ResourceRow
								key={doc.id}
								doc={doc}
								editing={editing}
								isSelected={selected.has(doc.id)}
								onToggle={toggleOne}
								onPreview={setPreviewDoc}
							/>
						))}
					</AppTableBody>
				</AppTable>
			</div>

			{previewDoc && (
				<Suspense fallback={null}>
					<ResourcePreviewSheet doc={previewDoc} onClose={() => setPreviewDoc(null)} />
				</Suspense>
			)}
		</div>
	);
});
