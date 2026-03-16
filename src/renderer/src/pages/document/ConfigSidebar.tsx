import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Calendar } from 'lucide-react';
import type { OutputFileMetadata } from '../../../../shared/types';
import { AppLabel } from '@/components/app';

interface ConfigSidebarProps {
	readonly open: boolean;
	readonly metadata: OutputFileMetadata | null;
}

function formatDate(isoString: string, locale: string): string {
	const date = new Date(isoString);
	return date.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

const ConfigSidebar: React.FC<ConfigSidebarProps> = ({ open, metadata }) => {
	const { t, i18n } = useTranslation();

	const formattedCreatedAt = useMemo(
		() => (metadata?.createdAt ? formatDate(metadata.createdAt, i18n.language) : null),
		[metadata?.createdAt, i18n.language]
	);

	const formattedUpdatedAt = useMemo(
		() => (metadata?.updatedAt ? formatDate(metadata.updatedAt, i18n.language) : null),
		[metadata?.updatedAt, i18n.language]
	);

	return (
		<div
			className={`shrink-0 border-l border-border bg-muted/30 overflow-y-auto transition-all duration-300 ease-in-out ${open ? 'w-72' : 'w-0'}`}
		>
			<div className="w-72 p-4">
				<div className="flex items-center justify-end mb-4">
					<AppButton variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
						<X className="h-3.5 w-3.5" />
					</AppButton>
				</div>

				{/* Document Info */}
				{metadata && (
					<>
						<div className="mb-1">
							<span className="text-xs font-medium text-muted-foreground/70">
								{t('configSidebar.documentInfo')}
							</span>
						</div>
						<div className="space-y-3">
							<div className="space-y-1">
								<AppLabel className="text-xs text-muted-foreground">
									{t('configSidebar.documentTitle')}
								</AppLabel>
								<div className="flex items-center gap-1.5">
									<FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
									<span className="text-sm text-foreground truncate">{metadata.title || '—'}</span>
								</div>
							</div>
							<div className="space-y-1">
								<AppLabel className="text-xs text-muted-foreground">
									{t('configSidebar.documentType')}
								</AppLabel>
								<span className="text-sm text-foreground capitalize">{metadata.type}</span>
							</div>
							{formattedCreatedAt && (
								<div className="space-y-1">
									<AppLabel className="text-xs text-muted-foreground">
										{t('configSidebar.createdAt')}
									</AppLabel>
									<div className="flex items-center gap-1.5">
										<Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										<span className="text-sm text-foreground">{formattedCreatedAt}</span>
									</div>
								</div>
							)}
							{formattedUpdatedAt && (
								<div className="space-y-1">
									<AppLabel className="text-xs text-muted-foreground">
										{t('configSidebar.updatedAt')}
									</AppLabel>
									<div className="flex items-center gap-1.5">
										<Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
										<span className="text-sm text-foreground">{formattedUpdatedAt}</span>
									</div>
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ConfigSidebar;
