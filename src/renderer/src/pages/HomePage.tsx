import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PenLine, Bot, FolderOpen, ArrowRight, Star, Clock3 } from 'lucide-react';
import { Separator } from '@/components/ui/Separator';
import { useCreateWriting } from '@/hooks/use-create-writing';
import { useAppSelector } from '@/store';
import { selectAllDocuments } from '@/store/documents';

// ---------------------------------------------------------------------------
// Category definitions — labels resolved via i18n at render time
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CategoryCardProps {
	icon: React.ElementType;
	labelKey: string;
	descriptionKey: string;
	accent: string;
	onClick: () => void;
	disabled?: boolean;
}

const CategoryCard = React.memo(function CategoryCard({
	icon: Icon,
	labelKey,
	descriptionKey,
	accent,
	onClick,
	disabled,
}: CategoryCardProps) {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-foreground/15 hover:bg-card/95 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
		>
			<div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
				<Icon className="h-4 w-4" />
			</div>
			<div>
				<p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
				<p className="text-xs text-muted-foreground mt-0.5">{t(descriptionKey)}</p>
			</div>
			<ArrowRight className="mt-auto h-3.5 w-3.5 self-end text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
		</button>
	);
});
CategoryCard.displayName = 'CategoryCard';

function formatRelativeTime(timestampMs: number): string {
	const seconds = Math.floor((Date.now() - timestampMs) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return `${Math.floor(days / 7)}w ago`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const HomePage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { createWriting, isCreating: creatingWriting } = useCreateWriting();
	const allDocuments = useAppSelector(selectAllDocuments);
	const recentDocuments = [...allDocuments].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);

	const hour = new Date().getHours();
	const greeting =
		hour < 12 ? t('home.goodMorning') : hour < 18 ? t('home.goodAfternoon') : t('home.goodEvening');

	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-3xl mx-auto px-8 py-12 space-y-10">
				{/* Hero */}
				<div>
					<h1 className="text-2xl font-medium text-foreground tracking-tight">{greeting}</h1>
					<p className="text-sm text-muted-foreground mt-1">{t('home.workOnToday')}</p>
				</div>

				{/* Categories */}
				<section className="space-y-3">
					<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t('home.quickActions', 'Quick actions')}
					</p>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						<CategoryCard
							icon={PenLine}
							labelKey="home.writing"
							descriptionKey="home.writingDescription"
							accent="bg-foreground/8 text-foreground"
							onClick={createWriting}
							disabled={creatingWriting}
						/>
						<CategoryCard
							icon={FolderOpen}
							labelKey="home.documents"
							descriptionKey="home.documentsDescription"
							accent="bg-muted text-foreground"
							onClick={() => navigate('/resources/documents')}
						/>
						<CategoryCard
							icon={Bot}
							labelKey="common.agents"
							descriptionKey="home.chatDescription"
							accent="bg-secondary text-foreground"
							onClick={() => navigate('/agents')}
						/>
					</div>
				</section>

				<Separator />

				{/* Recent documents */}
				<section className="space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							{t('home.recent', 'Recent')}
						</p>
					</div>

					{recentDocuments.length === 0 ? (
						<div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
							{t('home.noRecentWritings', 'No writings yet. Create one to get started.')}
						</div>
					) : (
						<div className="rounded-xl border border-border bg-card overflow-hidden">
							{recentDocuments.map((doc, index) => (
								<button
									key={doc.id}
									type="button"
									onClick={() => navigate(`/content/${doc.id}`)}
									className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
										index !== 0 ? 'border-t border-border' : ''
									}`}
								>
									<div className="h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center">
										<FolderOpen className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">
											{doc.title || t('sidebar.untitledWriting', 'Untitled')}
										</p>
										<p className="truncate text-xs text-muted-foreground mt-0.5">{doc.path}</p>
									</div>
									<div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
										<Clock3 className="h-3.5 w-3.5" />
										<span>{formatRelativeTime(doc.updatedAt)}</span>
									</div>
									<ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
								</button>
							))}
						</div>
					)}
				</section>

				<Separator />

				{/* Tips */}
				<section className="flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4">
					<Star className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
					<div>
						<p className="text-sm font-medium text-foreground">{t('home.tip')}</p>
						<p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
							{t('home.tipContent')}
						</p>
					</div>
				</section>
			</div>
		</div>
	);
};

export default HomePage;
