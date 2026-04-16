import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

interface CategoryCardProps {
	readonly icon: React.ElementType;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly accent: string;
	readonly onClick: () => void;
	readonly disabled?: boolean;
}

export const CategoryCard = React.memo(function CategoryCard({
	icon: Icon,
	labelKey,
	descriptionKey,
	accent,
	onClick,
	disabled,
}: CategoryCardProps) {
	const { t } = useTranslation();

	return (
		<Card
			size="sm"
			className="group cursor-pointer transition-all hover:ring-foreground/15 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
			onClick={disabled ? undefined : onClick}
			aria-disabled={disabled}
		>
			<CardContent className="flex flex-col gap-3">
				<div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent}`}>
					<Icon className="h-4 w-4" />
				</div>
				<div>
					<p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
					<p className="mt-0.5 text-xs text-muted-foreground">{t(descriptionKey)}</p>
				</div>
				<ArrowRight className="mt-auto h-3.5 w-3.5 self-end text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
			</CardContent>
		</Card>
	);
});

CategoryCard.displayName = 'CategoryCard';
