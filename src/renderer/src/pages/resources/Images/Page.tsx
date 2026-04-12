import { useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Columns2,
	Columns3,
	Columns4,
	FolderOpen,
	Grid3x3,
	Pencil,
	Search,
	Upload,
	X,
} from 'lucide-react';
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
import { Card } from '@/components/ui/Card';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/InputGroup';
import { cn } from '@/lib/utils';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';
import { useImagesContext } from './context/ImagesContext';
import Layout from './Layout';

type ColumnCount = 2 | 3 | 4 | 5;

const COLUMN_OPTIONS: { value: ColumnCount; icon: typeof Columns2; label: string }[] = [
	{ value: 2, icon: Columns2, label: '2 columns' },
	{ value: 3, icon: Columns3, label: '3 columns' },
	{ value: 4, icon: Columns4, label: '4 columns' },
	{ value: 5, icon: Grid3x3, label: '5 columns' },
];

const COLUMN_CLASS: Record<ColumnCount, string> = {
	2: 'grid-cols-2',
	3: 'grid-cols-3',
	4: 'grid-cols-4',
	5: 'grid-cols-5',
};

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

function PageContent(): ReactElement {
	const { t } = useTranslation();
	const section = RESOURCE_SECTIONS.images;
	const {
		filteredImages,
		isLoading,
		uploading,
		searchQuery,
		setSearchQuery,
		editing,
		handleToggleEdit,
		handleOpenResourcesFolder,
		handleUpload,
	} = useImagesContext();

	const [columns, setColumns] = useState<ColumnCount>(3);

	const galleryImages = useMemo(
		() =>
			filteredImages.map((image) => ({
				src: toLocalResourceUrl(image.path),
				alt: image.name,
				name: image.name,
			})),
		[filteredImages]
	);

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
							<Button size="lg" onClick={handleUpload} disabled={uploading}>
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
				<ButtonGroup className="shrink-0">
					{COLUMN_OPTIONS.map(({ value, icon: Icon, label }) => (
						<Button
							key={value}
							variant={columns === value ? 'outline-selected' : 'outline'}
							size="icon"
							onClick={() => setColumns(value)}
							aria-label={label}
							aria-pressed={columns === value}
						>
							<Icon className="h-4 w-4" />
						</Button>
					))}
				</ButtonGroup>
			</PageSubHeader>
			<PageBody>
				{isLoading ? (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">{t(section.loadingKey)}</p>
					</div>
				) : (
					<div className="w-full p-4 sm:p-6 lg:p-8">
						<div className={cn('grid gap-6', COLUMN_CLASS[columns])}>
							{galleryImages.map((image, index) => (
								<Card
									key={index}
									className="group relative overflow-hidden rounded-2xl border-none p-0 after:absolute after:h-full after:w-full after:bg-linear-to-b after:from-transparent after:from-60% after:to-gray-950"
								>
									<img
										src={image.src}
										alt={image.alt}
										className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
									<div className="absolute bottom-0 z-10 flex flex-col gap-1 ps-4 pb-4">
										<h3 className="truncate text-sm font-semibold text-white">
											{image.name}
										</h3>
									</div>
								</Card>
							))}
						</div>
					</div>
				)}
			</PageBody>
		</PageContainer>
	);
}

export default function Page(): ReactElement {
	return (
		<Layout>
			<PageContent />
		</Layout>
	);
}
