import { useCallback, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Pencil, Search, Upload, X } from 'lucide-react';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderItems,
	PageHeaderTitle,
	PageSubHeader,
} from '@/components/app/base/Page';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/InputGroup';
import { Gallery, type GallerySection } from '@/components/app/Gallery';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';

const GALLERY_SECTIONS: GallerySection[] = [
	{
		images: [{ src: 'https://placehold.co/800x600?text=Image+1', alt: 'Image 1' }],
	},
	{
		type: 'grid',
		images: [
			{ src: 'https://placehold.co/400x400?text=Image+2', alt: 'Image 2' },
			{ src: 'https://placehold.co/400x400?text=Image+3', alt: 'Image 3' },
			{ src: 'https://placehold.co/400x400?text=Image+4', alt: 'Image 4' },
			{ src: 'https://placehold.co/400x400?text=Image+5', alt: 'Image 5' },
		],
	},
];

export default function ImagesPage(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.images;
	const [searchQuery, setSearchQuery] = useState('');
	const [editing, setEditing] = useState(false);

	const handleOpenResourcesFolder = useCallback(() => {
		window.workspace.openResourcesFolder();
	}, []);

	const handleToggleEdit = useCallback(() => {
		setEditing((current) => !current);
	}, []);

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>{t(section.titleKey)}</PageHeaderTitle>
				<PageHeaderItems>
					{!editing && (
						<>
							<Button variant="outline" size="lg" onClick={handleOpenResourcesFolder}>
								<FolderOpen />
							</Button>
							<Button size="lg">
								<Upload />
								{t(section.uploadKey)}
							</Button>
						</>
					)}
					<Button variant="outline" size="lg" onClick={handleToggleEdit}>
						{editing ? (
							<>
								<X />
								Done
							</>
						) : (
							<>
								<Pencil />
								Edit
							</>
						)}
					</Button>
				</PageHeaderItems>
			</PageHeader>
			<PageSubHeader>
				<ButtonGroup className="min-w-0 flex-1">
					<InputGroup>
						<InputGroupAddon>
							<InputGroupText>
								<Search />
							</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder={t(section.searchPlaceholderKey)}
						/>
					</InputGroup>
				</ButtonGroup>
			</PageSubHeader>
			<PageBody>
				<Gallery sections={GALLERY_SECTIONS} />
			</PageBody>
		</PageContainer>
	);
}
