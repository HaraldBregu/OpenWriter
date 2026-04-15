import { ImagePreviewDialog as BaseImagePreviewDialog } from '@/components/editor/extensions/image/components/ImagePreviewDialog';
import { useInfoDispatch } from '../hooks/use-info-dispatch';
import { useInfoState } from '../hooks/use-info-state';

export function ImagePreviewDialog(): React.ReactElement {
	const { previewImage } = useInfoState();
	const dispatch = useInfoDispatch();

	return (
		<BaseImagePreviewDialog
			open={previewImage !== null}
			onOpenChange={(open) => {
				if (!open) dispatch({ type: 'IMAGE_PREVIEW_CLOSED' });
			}}
			src={previewImage?.src ?? null}
			alt={previewImage?.alt ?? null}
		/>
	);
}
