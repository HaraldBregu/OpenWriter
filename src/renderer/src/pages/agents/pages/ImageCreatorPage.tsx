import type { ReactElement } from 'react';
import { AGENT_DEFINITIONS } from '../../../../../shared/agents';
import { AgentForm } from '../components';

const DEFINITION = AGENT_DEFINITIONS.find((d) => d.id === 'image-creator')!;

export default function ImageCreatorPage(): ReactElement {
	return (
		<div className="w-full max-w-2xl">
			<AgentForm definition={DEFINITION} />
		</div>
	);
}
