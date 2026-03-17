import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';

interface AgenticSidebarProps {
	readonly open: boolean;
}

const AgenticSidebar: React.FC<AgenticSidebarProps> = ({ open }) => {
	const { t } = useTranslation();

	return (
		<div
			className={`shrink-0 flex flex-col border-r border-border bg-muted/30 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out ${open ? 'w-80' : 'w-0'}`}
		>
			<div className="w-80 flex flex-col items-center justify-center flex-1 p-4 text-muted-foreground">
				<Bot className="h-8 w-8 mb-2" />
				<span className="text-xs">{t('agenticSidebar.placeholder')}</span>
			</div>
		</div>
	);
};

export default AgenticSidebar;
