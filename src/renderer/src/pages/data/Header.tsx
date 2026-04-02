import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, FolderOpen } from 'lucide-react';
import { AppButton } from '../../components/app';

interface HeaderProps {
	onOpenFolder: () => void;
}

const Header: React.FC<HeaderProps> = memo(function Header({ onOpenFolder }) {
	const { t } = useTranslation();

	return (
		<header className="shrink-0 border-b px-6 py-3">
			<div className="flex items-center gap-2">
				<Database className="h-5 w-5 text-muted-foreground" />
				<h1 className="text-lg font-semibold">{t('dataPage.title', 'Data')}</h1>
				<div className="ml-auto flex items-center gap-2">
					<AppButton size="icon" variant="outline" className="h-8 w-8" onClick={onOpenFolder}>
						<FolderOpen className="h-3.5 w-3.5" />
					</AppButton>
				</div>
			</div>
		</header>
	);
});

export default Header;
