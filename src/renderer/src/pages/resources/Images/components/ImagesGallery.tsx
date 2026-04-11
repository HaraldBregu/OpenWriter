import { useMemo, type ReactElement } from 'react';
import { Gallery, type GallerySection } from '@/components/app/Gallery';
import { useImagesContext } from '../context/ImagesContext';

function toLocalResourceUrl(filePath: string): string {
	const normalized = filePath.replace(/\\/g, '/');
	const urlPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
	return `local-resource://localhost${urlPath}`;
}

export function ImagesGallery(): ReactElement {
	const { filteredImages } = useImagesContext();

	const sections = useMemo<GallerySection[]>(() => {
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

	return <Gallery sections={sections} />;
}
