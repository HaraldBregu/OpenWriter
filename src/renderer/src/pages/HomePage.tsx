import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PenLine, Puzzle, ArrowRight, Star, Layers } from 'lucide-react';
import { AppSeparator } from '@/components/app';
import { useCreateWriting } from '@/hooks/use-create-writing';

// ---------------------------------------------------------------------------
// Category definitions — labels resolved via i18n at render time
// ---------------------------------------------------------------------------

const categoryDefs = [
	{
		icon: PenLine,
		labelKey: 'home.writing',
		descriptionKey: 'home.writingDescription',
		accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
	},
	{
		icon: MessageSquarePlus,
		labelKey: 'home.chat',
		descriptionKey: 'home.chatDescription',
		accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
	},
	{
		icon: Layers,
		labelKey: 'home.skills',
		descriptionKey: 'home.skillsDescription',
		accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
	},
];

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
			className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-5 hover:border-border/80 hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
				<Icon className="h-4 w-4" />
			</div>
			<div>
				<p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
				<p className="text-xs text-muted-foreground mt-0.5">{t(descriptionKey)}</p>
			</div>
			<ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all mt-auto self-end" />
		</button>
	);
});
CategoryCard.displayName = 'CategoryCard';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const HomePage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { createWriting, isCreating: creatingWriting } = useCreateWriting();

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
					<div className="grid grid-cols-3 gap-3">
						<CategoryCard
							icon={categoryDefs[0].icon}
							labelKey={categoryDefs[0].labelKey}
							descriptionKey={categoryDefs[0].descriptionKey}
							accent={categoryDefs[0].accent}
							onClick={createWriting}
							disabled={creatingWriting}
						/>
						<CategoryCard
							icon={categoryDefs[1].icon}
							labelKey={categoryDefs[1].labelKey}
							descriptionKey={categoryDefs[1].descriptionKey}
							accent={categoryDefs[1].accent}
							onClick={() => {}}
							disabled
						/>
						<CategoryCard
							icon={categoryDefs[2].icon}
							labelKey={categoryDefs[2].labelKey}
							descriptionKey={categoryDefs[2].descriptionKey}
							accent={categoryDefs[2].accent}
							onClick={() => {}}
							disabled
						/>
					</div>
				</section>

				<AppSeparator />

				{/* Integrations */}
				<section className="space-y-3">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<button
							type="button"
							onClick={() => navigate('/integrations')}
							className="flex items-center gap-4 rounded-xl border border-border bg-background px-5 py-4 hover:shadow-sm hover:border-border/80 transition-all group text-left"
						>
							<div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
								<Puzzle className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium text-foreground">{t('home.integrations')}</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									{t('home.integrationsDescription')}
								</p>
							</div>
							<ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
						</button>
					</div>
				</section>

				<AppSeparator />

				{/* Tips */}
				<section className="rounded-xl border border-border bg-background px-5 py-4 flex items-start gap-3">
					<Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
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
