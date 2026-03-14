import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/Tabs';
import { TasksTab } from './TasksTab';
import { ReduxStateTab } from './ReduxStateTab';

type DebugTab = 'tasks' | 'redux';

const DEBUG_TABS: { value: DebugTab; labelKey: string }[] = [
	{ value: 'tasks', labelKey: 'debug.tasks' },
	{ value: 'redux', labelKey: 'debug.reduxState' },
];

export default function DebugPage(): React.JSX.Element {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<DebugTab>('tasks');

	return (
		<div className="flex flex-col h-full">
			<div className="px-6 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					<Bug className="h-5 w-5 text-muted-foreground" />
					<h1 className="text-lg font-semibold">{t('debug.title')}</h1>
				</div>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(v) => setActiveTab(v as DebugTab)}
				className="flex-1 min-h-0"
			>
				<TabsList>
					{DEBUG_TABS.map(({ value, labelKey }) => (
						<TabsTrigger key={value} value={value}>
							{t(labelKey)}
						</TabsTrigger>
					))}
				</TabsList>

				<TabsContent value="tasks" className="flex min-h-0">
					<TasksTab />
				</TabsContent>

				<TabsContent value="redux">
					<ReduxStateTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
