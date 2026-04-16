import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/Separator';
import { QuickActions, RecentDocuments, TipSection } from './components';
import Layout from './Layout';

function useGreeting(): string {
	const { t } = useTranslation();
	const hour = new Date().getHours();
	if (hour < 12) return t('home.goodMorning');
	if (hour < 18) return t('home.goodAfternoon');
	return t('home.goodEvening');
}

function PageContent(): ReactElement {
	const { t } = useTranslation();
	const greeting = useGreeting();

	return (
		<div className="h-full overflow-y-auto">
			<div className="mx-auto max-w-3xl space-y-10 px-8 py-12">
				<div>
					<h1 className="text-2xl font-medium tracking-tight text-foreground">{greeting}</h1>
					<p className="mt-1 text-sm text-muted-foreground">{t('home.workOnToday')}</p>
				</div>

				<QuickActions />

				<Separator />

				<RecentDocuments />

				<Separator />

				<TipSection />
			</div>
		</div>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
