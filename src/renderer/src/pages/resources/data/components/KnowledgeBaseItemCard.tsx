import type { ReactElement } from 'react';
import { Database, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import type { KnowledgeBase, KnowledgeBaseStatus } from '../types';

const STATUS_VARIANT: Record<KnowledgeBaseStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	ready: 'default',
	building: 'secondary',
	error: 'destructive',
	empty: 'outline',
};

const STATUS_LABEL: Record<KnowledgeBaseStatus, string> = {
	ready: 'Ready',
	building: 'Building',
	error: 'Error',
	empty: 'Empty',
};

interface KnowledgeBaseItemCardProps {
	readonly knowledgeBase: KnowledgeBase;
	readonly onDelete: (id: string) => void;
}

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export function KnowledgeBaseItemCard({
	knowledgeBase,
	onDelete,
}: KnowledgeBaseItemCardProps): ReactElement {
	return (
		<Card>
			<CardHeader>
				<div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
					<Database className="h-4 w-4 text-muted-foreground" />
				</div>
				<CardTitle className="truncate">{knowledgeBase.name}</CardTitle>
				<CardAction>
					<DropdownMenu>
						<DropdownMenuTrigger render={
							<Button variant="ghost" size="icon-sm" aria-label="Open menu">
								<MoreVertical />
							</Button>
						} />
						<DropdownMenuContent align="end">
							<DropdownMenuItem variant="destructive" onClick={() => onDelete(knowledgeBase.id)}>
								<Trash2 />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardAction>
			</CardHeader>

			<CardContent className="flex flex-col gap-3">
				{knowledgeBase.description && (
					<p className="text-sm text-muted-foreground line-clamp-2">{knowledgeBase.description}</p>
				)}
				<div className="flex flex-wrap gap-2">
					<Badge variant={STATUS_VARIANT[knowledgeBase.status]}>
						{STATUS_LABEL[knowledgeBase.status]}
					</Badge>
					<Badge variant="outline">{knowledgeBase.embeddingProvider}</Badge>
				</div>
				<div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
					<div>
						<span className="font-medium text-foreground">{knowledgeBase.documentCount}</span>
						{' '}documents
					</div>
					<div>
						<span className="font-medium text-foreground">{knowledgeBase.chunkCount}</span>
						{' '}chunks
					</div>
				</div>
				{knowledgeBase.error && (
					<p className="text-xs text-destructive">{knowledgeBase.error}</p>
				)}
			</CardContent>

			<CardFooter className="text-xs text-muted-foreground">
				Created {formatDate(knowledgeBase.createdAt)}
			</CardFooter>
		</Card>
	);
}
