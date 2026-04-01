import React from 'react';
import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Header from './Header';

const Layout: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex h-full flex-col">
			<Header />

			<div className="flex flex-1 items-center justify-center p-6">
				<div className="flex max-w-md flex-col items-center gap-4 text-center">
					<div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40">
						<Database className="h-6 w-6 text-muted-foreground" />
					</div>
					<div className="space-y-2">
						<h2 className="text-lg font-semibold tracking-tight">
							{t('dataPage.emptyTitle', 'No data view yet')}
						</h2>
						<p className="text-sm text-muted-foreground">
							{t(
								'dataPage.emptyDescription',
								'This page is ready for future data features.'
							)}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export { Layout };
