import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/Command';
import { useAppSelector } from '../../../store';
import { selectAllDocuments } from '../../../store/workspace';

interface DocumentCommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DocumentCommandPalette({ open, onOpenChange }: DocumentCommandPaletteProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const documentsFromStore = useAppSelector(selectAllDocuments);

	const documents = useMemo(
		() => [...documentsFromStore].sort((a, b) => b.createdAt - a.createdAt),
		[documentsFromStore]
	);

	const handleSelect = (id: string): void => {
		onOpenChange(false);
		navigate(`/content/${id}`);
	};

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title={t('commandPalette.documents.title', 'Open document')}
			description={t('commandPalette.documents.description', 'Search and open a document')}
		>
			<CommandInput
				placeholder={t('commandPalette.documents.placeholder', 'Search documents…')}
			/>
			<CommandList>
				<CommandEmpty>
					{t('commandPalette.documents.empty', 'No documents found.')}
				</CommandEmpty>
				{documents.length > 0 && (
					<CommandGroup
						heading={t('commandPalette.documents.heading', 'Documents')}
					>
						{documents.map((doc) => (
							<CommandItem
								key={doc.id}
								value={`${doc.title || ''} ${doc.id}`}
								onSelect={() => handleSelect(doc.id)}
							>
								<FileText />
								<span className="flex-1 truncate">
									{doc.title || t('sidebar.untitledWriting', 'Untitled')}
								</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}
			</CommandList>
		</CommandDialog>
	);
}
