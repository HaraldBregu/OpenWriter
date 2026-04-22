import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Tag } from 'lucide-react';
import { SettingRow } from '@pages/settings/components';
import { useInfoState } from '../hooks/use-info-state';

function formatDate(isoString: string, locale: string): string {
	const date = new Date(isoString);
	return date.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
}

export function DocumentMetaSection(): React.ReactElement | null {
	const { t, i18n } = useTranslation();
	const { documentConfig } = useInfoState();

	const formattedDate = useMemo(() => {
		const iso = documentConfig?.updatedAt ?? documentConfig?.createdAt;
		return iso ? formatDate(iso, i18n.language) : null;
	}, [documentConfig?.updatedAt, documentConfig?.createdAt, i18n.language]);

	if (!documentConfig) return null;

	return (
		<>
			<SettingRow label={t('configSidebar.documentTitle')}>
				<span className="text-sm font-medium text-foreground truncate max-w-[140px] block">
					{documentConfig.title}
				</span>
			</SettingRow>

			<SettingRow label={t('configSidebar.documentType')}>
				<div className="flex items-center gap-1.5">
					<Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
					<span className="text-sm text-foreground capitalize">{documentConfig.type}</span>
				</div>
			</SettingRow>

			{formattedDate && (
				<SettingRow label={t('configSidebar.updatedAt')}>
					<div className="flex items-center gap-1.5">
						<Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
						<span className="text-sm text-foreground">{formattedDate}</span>
					</div>
				</SettingRow>
			)}
		</>
	);
}
