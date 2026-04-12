import { useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Columns2, Columns3, Columns4, FolderOpen, Grid3x3, Pencil, Search, Upload, X } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { RESOURCE_SECTIONS } from '../shared/resource-sections';

interface GalleryImage {
	src: string;
	alt: string;
}

interface GallerySection {
	type?: string;
	images: GalleryImage[];
}
import { useImagesContext } from './context/ImagesContext';
import Layout from './Layout';

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

	const gallerySections = useMemo<GallerySection[]>(() => {
		if (filteredImages.length === 0) return [];
		return [
			{
				type: 'grid',
				images: filteredImages.map((image) => ({
					src: toLocalResourceUrl(image.path),
					alt: image.name,
				})),
			},
		];
	}, [filteredImages]);

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
			</PageSubHeader>
			<PageBody>
				{isLoading ? (
					<div className="flex flex-1 items-center justify-center py-16">
						<p className="text-sm text-muted-foreground">{t(section.loadingKey)}</p>
					</div>
				) : (
					<section className="py-8 sm:py-16 lg:py-24">
						<div className="mx-auto px-4 sm:px-6 lg:px-8">
							<div className="grid gap-6 md:grid-cols-2">
								{gallerySections.map((gallerySection, sectionIndex) => (
									<div
										key={sectionIndex}
										className={cn({
											'grid grid-cols-2 gap-6': gallerySection.type === 'grid',
										})}
									>
										{gallerySection.images.map((image, imageIndex) => (
											<img
												key={imageIndex}
												src={image.src}
												alt={image.alt}
												className="rounded-lg object-cover"
											/>
										))}
									</div>
								))}
							</div>
						</div>
					</section>
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
