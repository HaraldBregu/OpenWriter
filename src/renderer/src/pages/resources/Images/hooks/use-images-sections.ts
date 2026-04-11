import type { GallerySection } from '@/components/app/Gallery';

const PLACEHOLDER_SECTIONS: GallerySection[] = [
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

export async function loadImagesSections(): Promise<GallerySection[]> {
	return PLACEHOLDER_SECTIONS;
}
