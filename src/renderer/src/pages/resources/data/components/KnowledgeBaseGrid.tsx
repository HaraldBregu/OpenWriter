import type { ReactElement } from 'react';
import { useContext } from '../hooks/use-context';
import { KnowledgeBaseCreateCard } from './KnowledgeBaseCreateCard';
import { KnowledgeBaseItemCard } from './KnowledgeBaseItemCard';

export function KnowledgeBaseGrid(): ReactElement {
	const { knowledgeBases, uploading, setKbDialogOpen, handleDeleteKnowledgeBase } = useContext();

	return (
		<div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
			{knowledgeBases.map((kb) => (
				<KnowledgeBaseItemCard
					key={kb.id}
					knowledgeBase={kb}
					onDelete={handleDeleteKnowledgeBase}
				/>
			))}
			<KnowledgeBaseCreateCard
				onCreateClick={() => setKbDialogOpen(true)}
				disabled={uploading}
			/>
		</div>
	);
}
