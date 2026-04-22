import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { TasksTab } from './tasks/TasksTab';

interface TasksDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function TasksDialog({ open, onOpenChange }: TasksDialogProps) {
	const { t } = useTranslation();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[calc(100vh-6rem)] min-w-[calc(100vw-8rem)] flex-col p-0 gap-0">
				<DialogHeader className="px-6 py-3 border-b shrink-0">
					<DialogTitle className="flex items-center gap-2 text-lg font-semibold">
						<Bug className="h-5 w-5 text-muted-foreground" />
						{t('debug.tasks')}
					</DialogTitle>
				</DialogHeader>
				<div className="flex flex-1 min-h-0">
					<TasksTab />
				</div>
			</DialogContent>
		</Dialog>
	);
}
