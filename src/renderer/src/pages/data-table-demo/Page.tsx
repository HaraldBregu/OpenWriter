import type { ReactElement } from 'react';

import { columns } from './columns';
import { payments } from './data';
import { DataTable } from './DataTable';

export default function DataTableDemoPage(): ReactElement {
	return (
		<div className="container mx-auto py-10">
			<DataTable columns={columns} data={payments} />
		</div>
	);
}
