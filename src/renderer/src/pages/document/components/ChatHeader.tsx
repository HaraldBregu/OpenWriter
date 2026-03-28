import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock3, MessageSquarePlus } from 'lucide-react';
import {
	AppButton,
	AppDropdownMenu,
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	AppDropdownMenuTrigger,
} from '@/components/app';

const ChatHeader: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="shrink-0 border-b border-border bg-background/80 px-5 py-3">
			<div className="flex items-center justify-between">
				<h2 className="truncate pr-4 text-base font-semibold tracking-tight text-foreground">
					{t('agenticPanel.headerTitle', 'General conversation and greeting')}
				</h2>
				<div className="flex items-center gap-2">
					<AppDropdownMenu>
						<AppDropdownMenuTrigger asChild>
							<AppButton
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
								aria-label={t('agenticPanel.openHistory', 'Open chat history')}
							>
								<Clock3 className="h-4 w-4" />
							</AppButton>
						</AppDropdownMenuTrigger>
						<AppDropdownMenuContent align="end" className="min-w-44">
							<AppDropdownMenuItem>
								{t('agenticPanel.historyMenu.openRecent', 'Open recent chats')}
							</AppDropdownMenuItem>
							<AppDropdownMenuItem>
								{t('agenticPanel.historyMenu.rename', 'Rename current chat')}
							</AppDropdownMenuItem>
							<AppDropdownMenuItem className="text-destructive focus:text-destructive">
								{t('agenticPanel.historyMenu.clear', 'Clear current chat')}
							</AppDropdownMenuItem>
						</AppDropdownMenuContent>
					</AppDropdownMenu>
					<AppButton
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
						aria-label={t('agenticPanel.newChat', 'Start new chat')}
					>
						<MessageSquarePlus className="h-4 w-4" />
					</AppButton>
				</div>
			</div>
		</div>
	);
};

export { ChatHeader };
