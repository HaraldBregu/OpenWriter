import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, ClipboardCheck, ImageIcon, PenLine } from 'lucide-react';
import { AgentsProvider } from '../../agents/Provider';
import {
	AgentForm,
	ASSISTANT,
	Bootstrap,
	CONTENT_REVIEWER,
	CONTENT_WRITER,
	IMAGE_CREATOR,
} from '../../agents/Page';

export default function AgentsPage(): ReactElement {
	const { t } = useTranslation();

	return (
		<AgentsProvider>
			<Bootstrap />
			<div className="w-full max-w-2xl">
				<h1 className="text-lg font-normal mb-6">{t('settings.tabs.agents', 'Agents')}</h1>
				<div className="flex flex-col gap-10">
					<AgentForm definition={CONTENT_REVIEWER} icon={ClipboardCheck} />
					<AgentForm definition={CONTENT_WRITER} icon={PenLine} />
					<AgentForm definition={IMAGE_CREATOR} icon={ImageIcon} />
					<AgentForm definition={ASSISTANT} icon={Bot} />
				</div>
			</div>
		</AgentsProvider>
	);
}
