import { useTranslation } from 'react-i18next';
import { Copy, Link, Trash2 } from 'lucide-react';
import { SectionHeader } from '@pages/settings/components';
import { useDocumentState } from '../../../hooks';
import { useInfoDispatch } from '../hooks/use-info-dispatch';
import { useInfoState } from '../hooks/use-info-state';

const ACTION_BUTTON_CLASS =
	'flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60';

export function ActionsSection(): React.ReactElement | null {
	const { t } = useTranslation();
	const { documentId } = useDocumentState();
	const { isDeleting } = useInfoState();
	const dispatch = useInfoDispatch();

	if (!documentId) return null;

	return (
		<>
			<SectionHeader title={t('configSidebar.actions')} />
			<div className="space-y-1">
				<button type="button" className={ACTION_BUTTON_CLASS}>
					<Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
					{t('configSidebar.duplicate')}
				</button>
				<button type="button" className={ACTION_BUTTON_CLASS}>
					<Link className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
					{t('configSidebar.shareLink')}
				</button>
				<button
					type="button"
					onClick={() => dispatch({ type: 'CONFIRM_DELETE_OPEN_CHANGED', open: true })}
					disabled={isDeleting}
					className={`${ACTION_BUTTON_CLASS} hover:bg-destructive/10 hover:text-destructive`}
				>
					<Trash2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
					{t('configSidebar.deletePermanently')}
				</button>
			</div>
		</>
	);
}
