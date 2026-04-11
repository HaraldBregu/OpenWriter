import type { ReactElement } from 'react';
import { Gallery } from '@/components/app/Gallery';
import { useImagesContext } from '../context/ImagesContext';

export function ImagesGallery(): ReactElement {
	const { filteredSections } = useImagesContext();
	return <Gallery sections={filteredSections} />;
}
