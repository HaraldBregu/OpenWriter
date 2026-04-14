import { useState } from 'react';
import type { ReactElement } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface MarkdownDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function MarkdownDialog({ open, onOpenChange }: MarkdownDialogProps): ReactElement {
	const [name, setName] = useState('');
	const [content, setContent] = useState('');

	const handleClose = (nextOpen: boolean): void => {
		if (!nextOpen) {
			setName('');
			setContent('');
		}
		onOpenChange(nextOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileText className="h-4 w-4" />
						Add Markdown
					</DialogTitle>
					<DialogDescription>
						Create a new markdown document.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">Name</label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="document"
							className="h-8 text-xs"
						/>
					</div>
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">Content</label>
						<Textarea
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="# Title"
							className="min-h-48 text-xs"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => handleClose(false)}>
						Cancel
					</Button>
					<Button disabled={!name.trim() || !content.trim()}>Save</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
