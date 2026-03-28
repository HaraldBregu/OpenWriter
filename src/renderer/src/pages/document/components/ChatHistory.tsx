import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Trash2 } from 'lucide-react';
import {
	AppButton,
	AppCollapsible,
	AppCollapsiblePanel,
	AppCollapsibleTrigger,
} from '@/components/app';

interface MockChatHistoryItem {
	id: string;
	createdAt: string;
}

function createMockHistory(): MockChatHistoryItem[] {
	const now = Date.now();
	return Array.from({ length: 7 }).map((_, index) => {
		const offsetMs = (index + 1) * 60 * 60 * 1000;
		const createdAt = new Date(now - offsetMs).toISOString();
		return { id: `mock-chat-${index + 1}`, createdAt };
	});
}

const ChatHistory: React.FC = () => {
	const { t } = useTranslation();
	const [historyOpen, setHistoryOpen] = useState(false);
	const [mockHistory, setMockHistory] = useState<MockChatHistoryItem[]>(() => createMockHistory());
	const [selectedMockHistoryId, setSelectedMockHistoryId] = useState<string | null>(null);

	return (
		<div className="border-b border-border py-2">
			<AppCollapsible open={historyOpen} onOpenChange={setHistoryOpen}>
				<AppCollapsibleTrigger
					className={`w-full justify-between px-3 py-1 text-left ${
						historyOpen ? 'border-b border-border' : ''
					}`}
				>
					<p className="text-[11px] font-medium text-foreground">Chat history</p>
					<ChevronDown
						className={`h-4 w-4 text-muted-foreground transition-transform ${
							historyOpen ? 'rotate-180' : ''
						}`}
						aria-hidden="true"
					/>
				</AppCollapsibleTrigger>

				<AppCollapsiblePanel className="mt-1">
					{mockHistory.length === 0 ? (
						<p className="px-0 text-[10px] text-muted-foreground">
							{t('agenticPanel.historyEmpty', 'No previous chats yet')}
						</p>
					) : (
						<ul className="max-h-32 overflow-y-auto">
							{mockHistory.map((entry) => {
								const label = `${new Date(entry.createdAt).toLocaleString()}`;
								const isSelected = selectedMockHistoryId === entry.id;
								return (
									<li
										key={entry.id}
										className={`flex w-full items-center justify-between border-b px-3 py-1.5 ${
											isSelected ? 'border-primary/40 text-foreground' : 'border-border'
										}`}
									>
										<p className="truncate pr-2 text-[10px] text-foreground">{label}</p>
										<div className="flex items-center gap-1">
											<AppButton
												type="button"
												variant="ghost"
												size="icon-xs"
												className="h-6 w-6 rounded-none"
												aria-label={t('agenticPanel.deleteChat', 'Delete')}
												onClick={() => {
													setMockHistory((prev) => prev.filter((item) => item.id !== entry.id));
													setSelectedMockHistoryId((prev) => (prev === entry.id ? null : prev));
												}}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</AppButton>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</AppCollapsiblePanel>
			</AppCollapsible>
		</div>
	);
};

export { ChatHistory };
