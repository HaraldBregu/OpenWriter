import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export function TipSection(): ReactElement {
	const { t } = useTranslation();

	return (
		<Card size="sm">
			<CardContent className="flex items-start gap-3">
				<Star className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
				<div>
					<p className="text-sm font-medium text-foreground">{t('home.tip')}</p>
					<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
						{t('home.tipContent')}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
