import { useState } from 'react';
import { Bug } from 'lucide-react';
import { TasksTab } from './TasksTab';
import { TextContinuationTab } from './TextContinuationTab';
import { ReduxStateTab } from './ReduxStateTab';

type DebugTab = 'tasks' | 'redux' | 'text-continuation';

export default function DebugPage() {
	const [activeTab, setActiveTab] = useState<DebugTab>('tasks');

	const tabClass = (tab: DebugTab) =>
		`px-3 py-1 text-xs rounded-md border transition-colors ${
			activeTab === tab
				? 'bg-primary text-primary-foreground border-primary'
				: 'bg-background hover:bg-accent hover:text-accent-foreground'
		}`;

	return (
		<div className="flex flex-col h-full">
			<div className="px-6 py-3 border-b shrink-0">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Bug className="h-5 w-5 text-muted-foreground" />
						<h1 className="text-lg font-semibold">Debug</h1>
					</div>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setActiveTab('tasks')}
							className={tabClass('tasks')}
						>
							Tasks
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('text-continuation')}
							className={tabClass('text-continuation')}
						>
							Text Continuation
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('redux')}
							className={tabClass('redux')}
						>
							Redux State
						</button>
					</div>
				</div>
			</div>

			{activeTab === 'tasks' && <TasksTab />}
			{activeTab === 'text-continuation' && <TextContinuationTab />}
			{activeTab === 'redux' && <ReduxStateTab />}
		</div>
	);
}
