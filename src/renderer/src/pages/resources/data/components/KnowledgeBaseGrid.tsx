import type { ReactElement } from 'react';
import { Database, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/Empty';
import { useContext } from '../hooks/use-context';
import { KnowledgeBaseCreateCard } from './KnowledgeBaseCreateCard';
import { KnowledgeBaseItemCard } from './KnowledgeBaseItemCard';

export function KnowledgeBaseGrid(): ReactElement {
	const { knowledgeBases, uploading, setKbDialogOpen, handleDeleteKnowledgeBase } = useContext();

	if (knowledgeBases.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center p-6">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Database />
						</EmptyMedia>
						<EmptyTitle>No knowledge bases yet</EmptyTitle>
						<EmptyDescription>
							Create a knowledge base to embed and index your documents for AI-powered retrieval.
						</EmptyDescription>
					</EmptyHeader>
					<Button size="sm" onClick={() => setKbDialogOpen(true)} disabled={uploading}>
						<Plus className="h-4 w-4" />
						Create Knowledge Base
					</Button>
				</Empty>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
			{knowledgeBases.map((kb) => (
				<KnowledgeBaseItemCard
					key={kb.id}
					knowledgeBase={kb}
					onDelete={handleDeleteKnowledgeBase}
				/>
			))}
			<KnowledgeBaseCreateCard onCreateClick={() => setKbDialogOpen(true)} disabled={uploading} />
		</div>
	);
}
