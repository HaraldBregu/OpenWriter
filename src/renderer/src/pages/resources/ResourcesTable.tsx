import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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

interface ResourcesTableProps {
	documents: DocumentInfo[];
}

export function ResourcesTable({ documents }: ResourcesTableProps) {
	const [search, setSearch] = useState('');
	const [typeFilter, setTypeFilter] = useState(ALL_TYPES_VALUE);

	const mimeTypes = useMemo(() => {
		const types = new Set(documents.map((d) => d.mimeType));
		return Array.from(types).sort();
	}, [documents]);

	const filtered = useMemo(() => {
		const query = search.toLowerCase().trim();
		return documents.filter((doc) => {
			if (typeFilter !== ALL_TYPES_VALUE && doc.mimeType !== typeFilter) return false;
			if (query && !doc.name.toLowerCase().includes(query)) return false;
			return true;
		});
	}, [documents, search, typeFilter]);

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
						<AppTableHead>Name</AppTableHead>
						<AppTableHead>Type</AppTableHead>
						<AppTableHead className="text-right">Size</AppTableHead>
						<AppTableHead>Imported</AppTableHead>
						<AppTableHead>Last Modified</AppTableHead>
					</AppTableRow>
				</AppTableHeader>
				<AppTableBody>
					{filtered.map((doc) => (
						<AppTableRow key={doc.id}>
							<AppTableCell className="font-medium truncate max-w-[300px]">{doc.name}</AppTableCell>
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
	);
}
