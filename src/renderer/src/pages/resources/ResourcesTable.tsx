import {
	AppTable,
	AppTableHeader,
	AppTableBody,
	AppTableHead,
	AppTableRow,
	AppTableCell,
} from '../../components/app';
import type { DocumentInfo } from '../../../../shared/types';
import { formatBytes, formatDate } from './constants';

interface ResourcesTableProps {
	documents: DocumentInfo[];
}

export function ResourcesTable({ documents }: ResourcesTableProps) {
	return (
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
					{documents.map((doc) => (
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
