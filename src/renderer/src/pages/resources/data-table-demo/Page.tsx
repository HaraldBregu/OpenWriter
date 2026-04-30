import type { ReactElement } from 'react';

import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
} from '@/components/app/base/page';
import { Label } from '@/components/ui/Label';
import { columns } from './columns';
import { payments } from './data';
import { DataTable } from './DataTable';

export default function DataTableDemoPage(): ReactElement {
	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>
					<Label className="w-full text-left text-sm font-medium">Data Table</Label>
				</PageHeaderTitle>
			</PageHeader>
			<PageBody>
				<DataTable columns={columns} data={payments} />
			</PageBody>
		</PageContainer>
	);
}
