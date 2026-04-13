import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

const EmptyStateCard: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex min-h-0 flex-1 overflow-y-auto px-4 py-4">
			<div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
				<Card className="max-w-xs rounded-[1.75rem]">
					<CardContent className="flex flex-col items-center gap-3 px-6 py-8">
						<div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/82 dark:bg-accent/95">
							<Bot
								className="h-5 w-5 text-foreground/70 dark:text-foreground/95"
								aria-hidden="true"
							/>
						</div>
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">
								{t('agenticPanel.emptyTitle', 'Ask the assistant')}
							</p>
							<p className="text-xs leading-5 text-foreground/68 dark:text-muted-foreground/90">
								{t(
									'agenticPanel.emptyDescription',
									'Use it for writing, editing, research, conversation, and image ideas.'
								)}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export { EmptyStateCard };
