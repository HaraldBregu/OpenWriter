import React from 'react';
import { useTranslation } from 'react-i18next';

const Header: React.FC = () => {
	const { t } = useTranslation();

	return (
		<header className="shrink-0 border-b bg-background px-6 py-4">
			<div className="space-y-1">
				<h1 className="text-xl font-semibold tracking-tight">{t('dataPage.title', 'Data')}</h1>
				<p className="text-sm text-muted-foreground">
					{t('dataPage.description', 'A dedicated area for workspace data views and tooling.')}
				</p>
			</div>
		</header>
	);
};

export default Header;
