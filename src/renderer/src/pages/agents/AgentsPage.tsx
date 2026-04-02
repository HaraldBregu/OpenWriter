import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import {
	AppCard,
	AppCardContent,
	AppTable,
	AppTableBody,
	AppTableCell,
	AppTableHead,
	AppTableHeader,
	AppTableRow,
} from '@/components/app';
import { DEFAULT_AGENTS } from '../../../../shared/types';
import type { AgentConfig } from '../../../../shared/types';

function getAgentIcon(_agentId: string): {
	icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
	accentClassName: string;
} {
	return { icon: Bot, accentClassName: 'bg-muted text-muted-foreground' };
}

const AgentTableRow = React.memo(function AgentTableRow({ agent }: { agent: AgentConfig }) {
	const { icon: Icon, accentClassName } = getAgentIcon(agent.id);

	return (
		<AppTableRow>
			<AppTableCell className="w-[40%]">
				<div className="flex items-center gap-3">
					<div
						className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${accentClassName}`}
					>
						<Icon className="h-4 w-4" aria-hidden="true" />
					</div>
					<span className="text-sm font-medium text-foreground">{agent.name}</span>
				</div>
			</AppTableCell>
			<AppTableCell className="w-[60%]">
				<p className="text-sm text-muted-foreground">{agent.description}</p>
			</AppTableCell>
		</AppTableRow>
	);
});

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-6 py-3 shrink-0">
				<div className="flex items-center gap-2">
					<Bot className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
					<h1 className="text-lg font-semibold text-foreground">{t('agents.title', 'Agents')}</h1>
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-y-auto">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
					<AppCard>
						<AppCardContent className="p-0">
							<AppTable>
								<AppTableHeader>
									<AppTableRow>
										<AppTableHead className="w-[40%]">{t('agents.agent', 'Agent')}</AppTableHead>
										<AppTableHead className="w-[60%]">
											{t('agents.description', 'Description')}
										</AppTableHead>
									</AppTableRow>
								</AppTableHeader>
								<AppTableBody>
									{DEFAULT_AGENTS.map((agent) => (
										<AgentTableRow key={agent.id} agent={agent} />
									))}
								</AppTableBody>
							</AppTable>
						</AppCardContent>
					</AppCard>
				</div>
			</div>
		</div>
	);
};

export default AgentsPage;
