import { useCallback, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import {
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
import type { DocumentInfo } from '../../../../shared/types';
import { formatBytes, formatDate } from './constants';

const ALL_TYPES_VALUE = 'all';

type SortKey = 'name' | 'mimeType' | 'size' | 'importedAt' | 'lastModified';
type SortDirection = 'none' | 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
	{ key: 'name', label: 'Name' },
	{ key: 'mimeType', label: 'Type' },
	{ key: 'size', label: 'Size', className: 'text-right' },
	{ key: 'importedAt', label: 'Imported' },
	{ key: 'lastModified', label: 'Last Modified' },
];

function compareDocs(a: DocumentInfo, b: DocumentInfo, key: SortKey, dir: SortDirection): number {
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

interface ResourcesTableProps {
	documents: DocumentInfo[];
	onRemove: (ids: string[]) => Promise<void>;
}

export function ResourcesTable({ documents, onRemove }: ResourcesTableProps) {
	const [search, setSearch] = useState('');
	const [typeFilter, setTypeFilter] = useState(ALL_TYPES_VALUE);
	const [sortKey, setSortKey] = useState<SortKey>('name');
	const [sortDir, setSortDir] = useState<SortDirection>('none');
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [removing, setRemoving] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

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

	const filteredIds = useMemo(() => new Set(filtered.map((d) => d.id)), [filtered]);

	const allChecked = filtered.length > 0 && filtered.every((d) => selected.has(d.id));
	const someChecked = !allChecked && filtered.some((d) => selected.has(d.id));
	const selectedCount = [...selected].filter((id) => filteredIds.has(id)).length;

	const toggleAll = useCallback(() => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (allChecked) {
				for (const doc of filtered) next.delete(doc.id);
			} else {
				for (const doc of filtered) next.add(doc.id);
			}
			return next;
		});
	}, [allChecked, filtered]);

	const toggleOne = useCallback((id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleConfirmRemove = useCallback(async () => {
		setConfirmOpen(false);
		const ids = [...selected].filter((id) => filteredIds.has(id));
		if (ids.length === 0) return;
		setRemoving(true);
		try {
			await onRemove(ids);
			setSelected((prev) => {
				const next = new Set(prev);
				for (const id of ids) next.delete(id);
				return next;
			});
		} finally {
			setRemoving(false);
		}
	}, [selected, filteredIds, onRemove]);

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
							<AppTableHead className="w-[40px]">
								{selectedCount > 0 ? (
									<AppButton
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground hover:text-destructive"
										disabled={removing}
										onClick={() => setConfirmOpen(true)}
									>
										<Trash2 className="h-4 w-4" />
									</AppButton>
								) : (
									<input
										type="checkbox"
										className="h-4 w-4 accent-primary cursor-pointer"
										checked={allChecked}
										ref={(el) => {
											if (el) el.indeterminate = someChecked;
										}}
										onChange={toggleAll}
									/>
								)}
							</AppTableHead>
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
						</AppTableRow>
					</AppTableHeader>
					<AppTableBody>
						{filtered.map((doc) => (
							<AppTableRow key={doc.id} data-state={selected.has(doc.id) ? 'selected' : undefined}>
								<AppTableCell className="w-[40px]">
									<input
										type="checkbox"
										className="h-4 w-4 accent-primary cursor-pointer"
										checked={selected.has(doc.id)}
										onChange={() => toggleOne(doc.id)}
									/>
								</AppTableCell>
								<AppTableCell className="font-medium truncate max-w-[300px]">
									{doc.name}
								</AppTableCell>
								<AppTableCell className="text-muted-foreground">{doc.mimeType}</AppTableCell>
								<AppTableCell className="text-right text-muted-foreground tabular-nums">
									{formatBytes(doc.size)}
								</AppTableCell>
								<AppTableCell className="text-muted-foreground">
									{formatDate(doc.importedAt)}
								</AppTableCell>
								<AppTableCell className="text-muted-foreground">
									{formatDate(doc.lastModified)}
								</AppTableCell>
							</AppTableRow>
						))}
					</AppTableBody>
				</AppTable>
			</div>

			<AppAlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AppAlertDialogContent>
					<AppAlertDialogHeader>
						<AppAlertDialogTitle>Remove resources</AppAlertDialogTitle>
						<AppAlertDialogDescription>
							Are you sure you want to remove {selectedCount}{' '}
							{selectedCount === 1 ? 'resource' : 'resources'}? This action cannot be undone.
						</AppAlertDialogDescription>
					</AppAlertDialogHeader>
					<AppAlertDialogFooter>
						<AppAlertDialogCancel>Cancel</AppAlertDialogCancel>
						<AppAlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleConfirmRemove}
						>
							Remove
						</AppAlertDialogAction>
					</AppAlertDialogFooter>
				</AppAlertDialogContent>
			</AppAlertDialog>
		</div>
	);
}
