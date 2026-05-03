import type { ReactElement } from 'react';
import { AGENT_DEFINITIONS } from '../../../../../shared/agents';
import { AgentForm } from '../components';

const DEFINITION = AGENT_DEFINITIONS.find((d) => d.id === 'content-reviewer')!;

export default function ContentReviewerPage(): ReactElement {
	return (
		<div className="w-full max-w-2xl">
			<AgentForm definition={DEFINITION} />
		</div>
	);
}
