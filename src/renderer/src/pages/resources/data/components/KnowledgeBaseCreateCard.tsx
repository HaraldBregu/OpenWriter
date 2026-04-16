import type { ReactElement } from 'react';
import { Database, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface KnowledgeBaseCreateCardProps {
	readonly onCreateClick: () => void;
	readonly disabled?: boolean;
}

export function KnowledgeBaseCreateCard({
	onCreateClick,
	disabled = false,
}: KnowledgeBaseCreateCardProps): ReactElement {
	return (
		<Card className="group flex flex-col items-center justify-center border-dashed transition-colors hover:border-primary/50 hover:bg-accent/50">
			<CardContent className="flex flex-col items-center gap-4 p-8 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
					<Database className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
				</div>
				<div className="space-y-1">
					<p className="font-medium text-sm">Create a knowledge base</p>
					<p className="text-xs text-muted-foreground">Import and index your data files</p>
				</div>
				<Button size="sm" onClick={onCreateClick} disabled={disabled}>
					<Plus className="h-4 w-4" />
					Create
				</Button>
			</CardContent>
		</Card>
	);
}
