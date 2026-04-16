import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Clock3, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/Empty';
import { useAppSelector } from '@/store';
import { selectAllDocuments } from '@/store/documents';
import { formatRelativeTime } from '../shared/format-time';

const MAX_RECENT = 8;

export function RecentDocuments(): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const allDocuments = useAppSelector(selectAllDocuments);
	const recentDocuments = [...allDocuments]
		.sort((a, b) => b.updatedAt - a.updatedAt)
		.slice(0, MAX_RECENT);

	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{t('home.recent', 'Recent')}
				</p>
			</div>

			{recentDocuments.length === 0 ? (
				<Empty className="border border-border bg-card">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<FolderOpen />
						</EmptyMedia>
						<EmptyTitle>{t('home.noRecentWritings', 'No writings yet. Create one to get started.')}</EmptyTitle>
						<EmptyDescription>
							{t('home.noRecentWritingsHint', 'Your recent documents will appear here.')}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<Card className="overflow-hidden p-0">
					{recentDocuments.map((doc, index) => (
						<button
							key={doc.id}
							type="button"
							onClick={() => navigate(`/content/${doc.id}`)}
							className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
								index !== 0 ? 'border-t border-border' : ''
							}`}
						>
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
								<FolderOpen className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">
									{doc.title || t('sidebar.untitledWriting', 'Untitled')}
								</p>
								<p className="mt-0.5 truncate text-xs text-muted-foreground">{doc.path}</p>
							</div>
							<div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
								<Clock3 className="h-3.5 w-3.5" />
								<span>{formatRelativeTime(doc.updatedAt)}</span>
							</div>
							<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
						</button>
					))}
				</Card>
			)}
		</section>
	);
}
