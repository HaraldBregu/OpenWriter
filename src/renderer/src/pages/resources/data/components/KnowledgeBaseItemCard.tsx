import type { ReactElement } from 'react';
import { Database, FileText, MoreVertical, Puzzle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import type { KnowledgeBase, KnowledgeBaseStatus } from '../types';

const STATUS_VARIANT: Record<KnowledgeBaseStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
	ready: 'default',
	building: 'secondary',
	error: 'destructive',
	empty: 'outline',
};

const STATUS_LABEL: Record<KnowledgeBaseStatus, string> = {
	ready: 'Ready',
	building: 'Building...',
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

function StatItem({
	icon: Icon,
	label,
	value,
}: {
	readonly icon: typeof FileText;
	readonly label: string;
	readonly value: string | number;
}): ReactElement {
	return (
		<Tooltip>
			<TooltipTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Icon className="h-3.5 w-3.5" />
				<span className="font-medium text-foreground">{value}</span>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

export function KnowledgeBaseItemCard({
	knowledgeBase,
	onDelete,
}: KnowledgeBaseItemCardProps): ReactElement {
	return (
		<Card className="flex flex-col">
			<CardHeader>
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Database className="h-4 w-4 text-primary" />
				</div>
				<CardTitle className="truncate">{knowledgeBase.name}</CardTitle>
				<CardAction>
					<DropdownMenu>
						<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Actions" />}>
							<MoreVertical />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem variant="destructive" onClick={() => onDelete(knowledgeBase.id)}>
								<Trash2 />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardAction>
			</CardHeader>

			<CardContent className="flex flex-1 flex-col gap-3">
				{knowledgeBase.description && (
					<p className="text-sm text-muted-foreground line-clamp-2">
						{knowledgeBase.description}
					</p>
				)}

				<div className="flex flex-wrap items-center gap-1.5">
					<Badge variant={STATUS_VARIANT[knowledgeBase.status]}>
						{STATUS_LABEL[knowledgeBase.status]}
					</Badge>
				</div>

				<div className="flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
					<div className="flex items-center gap-2 text-xs">
						<Puzzle className="h-3.5 w-3.5 text-muted-foreground" />
						<span className="truncate font-medium">{knowledgeBase.embeddingModel}</span>
					</div>
					<div className="text-xs text-muted-foreground">
						{knowledgeBase.embeddingProvider}
					</div>
				</div>

				<div className="flex items-center gap-4">
					<StatItem
						icon={FileText}
						label="Documents"
						value={knowledgeBase.documentCount}
					/>
					<StatItem
						icon={Database}
						label="Chunks"
						value={knowledgeBase.chunkCount}
					/>
				</div>

				{knowledgeBase.error && (
					<p className="text-xs text-destructive line-clamp-2">{knowledgeBase.error}</p>
				)}
			</CardContent>

			<CardFooter className="text-xs text-muted-foreground">
				Created {formatDate(knowledgeBase.createdAt)}
				{knowledgeBase.updatedAt !== knowledgeBase.createdAt && (
					<span className="ml-auto">Updated {formatDate(knowledgeBase.updatedAt)}</span>
				)}
			</CardFooter>
		</Card>
	);
}
