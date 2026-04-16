import React, { useCallback, useMemo, useReducer, useRef } from 'react';
import type { PixelCrop } from 'react-image-crop';
import { MIN_CROP_SIZE } from '../../../editor/shared';
import { useImageCanvas } from '../../../editor/hooks/use-image-canvas';
import { IMAGE_MODELS } from '../../../../../../shared/models';
import { ImageEditorContext } from './context/context';
import type { ImageEditorContextValue } from './context/context';
import { imageEditorReducer } from './context/reducer';
import type { EditMode, ImageEditorState } from './context/state';

const AI_PROCESSING_DELAY_MS = 300;

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = (): void => reject(new Error(`FileReader failed for ${file.name}`));
		reader.readAsDataURL(file);
	});
}

interface ImageEditorProviderProps {
	src: string;
	alt: string | null;
	initialMode?: EditMode;
	onSave: (dataUri: string) => void;
	onCancel: () => void;
	children: React.ReactNode;
}

export function ImageEditorProvider({
	src,
	alt,
	initialMode,
	onSave,
	onCancel,
	children,
}: ImageEditorProviderProps): React.JSX.Element {
	const [state, dispatch] = useReducer(
		imageEditorReducer,
		undefined,
		(): ImageEditorState => ({
			activeMode: initialMode ?? null,
			isProcessingAI: false,
			aiPrompt: '',
			aiFiles: [],
			aiPreviewUrls: [],
			isDragOver: false,
			selectedModelId: IMAGE_MODELS[0]?.modelId ?? '',
			crop: undefined,
		})
	);

	const editorRef = useRef<HTMLDivElement>(null);
	const aiTextareaRef = useRef<HTMLTextAreaElement>(null);
	const aiFileInputRef = useRef<HTMLInputElement>(null);

	const canvas = useImageCanvas(src);
	const { canvasRef, state: canvasState, resetCrop, setCropRegion, applyCrop, applyAI, exportDataUri } =
		canvas;

	const addAIFile = useCallback((file: File) => {
		readFileAsDataUri(file)
			.then((url) => dispatch({ type: 'ADD_AI_FILE', payload: { file, url } }))
			.catch(() => {});
	}, []);

	const handleCropChange = useCallback(
		(pixelCrop: PixelCrop): void => {
			dispatch({ type: 'SET_CROP', payload: pixelCrop });
			const el = canvasRef.current;
			if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
			const scaleX = el.width / el.clientWidth;
			const scaleY = el.height / el.clientHeight;
			setCropRegion({
				x: Math.round(pixelCrop.x * scaleX),
				y: Math.round(pixelCrop.y * scaleY),
				width: Math.round(pixelCrop.width * scaleX),
				height: Math.round(pixelCrop.height * scaleY),
			});
		},
		[canvasRef, setCropRegion]
	);

	const handleApplyCrop = useCallback((): void => {
		applyCrop();
		dispatch({ type: 'SET_CROP', payload: undefined });
	}, [applyCrop]);

	const handleResetCrop = useCallback((): void => {
		resetCrop();
		dispatch({ type: 'SET_CROP', payload: undefined });
	}, [resetCrop]);

	const handleSave = useCallback((): void => {
		const dataUri = exportDataUri();
		if (dataUri) onSave(dataUri);
	}, [exportDataUri, onSave]);

	const handleCancel = useCallback((): void => {
		onCancel();
	}, [onCancel]);

	const handleModeChange = useCallback(
		(mode: EditMode): void => {
			const prev = state.activeMode;
			const next = prev === mode ? null : mode;
			if (prev === 'crop' && next !== 'crop') {
				resetCrop();
				dispatch({ type: 'SET_CROP', payload: undefined });
			}
			dispatch({ type: 'SET_ACTIVE_MODE', payload: next });
		},
		[state.activeMode, resetCrop]
	);

	const handleAISubmit = useCallback((): void => {
		if (!state.aiPrompt.trim()) return;
		dispatch({ type: 'SET_PROCESSING_AI', payload: true });
		setTimeout(() => {
			applyAI(state.aiPrompt.trim());
			dispatch({ type: 'CLEAR_AI' });
			dispatch({ type: 'SET_ACTIVE_MODE', payload: null });
			dispatch({ type: 'SET_PROCESSING_AI', payload: false });
		}, AI_PROCESSING_DELAY_MS);
	}, [state.aiPrompt, applyAI]);

	const handleAIButtonClick = useCallback((): void => {
		if (state.isProcessingAI) return;
		handleModeChange('ai');
	}, [state.isProcessingAI, handleModeChange]);

	const handleCancelAI = useCallback((): void => {
		if (state.isProcessingAI) return;
		dispatch({ type: 'CLEAR_AI' });
		dispatch({ type: 'SET_ACTIVE_MODE', payload: null });
	}, [state.isProcessingAI]);

	const handlePromptKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleAISubmit();
			if (e.key === 'Escape') handleCancelAI();
		},
		[handleAISubmit, handleCancelAI]
	);

	const handleEditorKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>): void => {
			if (e.key === 'Escape') onCancel();
		},
		[onCancel]
	);

	const handleAIFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const selected = e.target.files;
			if (!selected) return;
			for (const file of Array.from(selected)) {
				if (file.type.startsWith('image/')) addAIFile(file);
			}
			e.target.value = '';
		},
		[addAIFile]
	);

	const handleAIDragOver = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
		e.preventDefault();
		dispatch({ type: 'SET_DRAG_OVER', payload: true });
	}, []);

	const handleAIDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
		e.preventDefault();
		dispatch({ type: 'SET_DRAG_OVER', payload: false });
	}, []);

	const handleAIDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>): void => {
			e.preventDefault();
			dispatch({ type: 'SET_DRAG_OVER', payload: false });
			for (const file of Array.from(e.dataTransfer.files)) {
				if (file.type.startsWith('image/')) addAIFile(file);
			}
		},
		[addAIFile]
	);

	const setAIPrompt = useCallback(
		(value: string) => dispatch({ type: 'SET_AI_PROMPT', payload: value }),
		[]
	);

	const setSelectedModelId = useCallback(
		(id: string) => dispatch({ type: 'SET_SELECTED_MODEL', payload: id }),
		[]
	);

	const removeAIFile = useCallback(
		(index: number) => dispatch({ type: 'REMOVE_AI_FILE', payload: index }),
		[]
	);

	const openFilePicker = useCallback(() => {
		aiFileInputRef.current?.click();
	}, []);

	const currentWidth = canvasState.dimensions?.width ?? 0;
	const currentHeight = canvasState.dimensions?.height ?? 0;
	const cropWidth = canvasState.cropRegion?.width ?? 0;
	const cropHeight = canvasState.cropRegion?.height ?? 0;
	const hasCropSelection =
		canvasState.cropRegion !== null && cropWidth >= MIN_CROP_SIZE && cropHeight >= MIN_CROP_SIZE;
	const cropDimensionLabel = hasCropSelection
		? `${Math.round(cropWidth)} x ${Math.round(cropHeight)} px`
		: `${currentWidth} x ${currentHeight} px`;

	const value = useMemo<ImageEditorContextValue>(
		() => ({
			src,
			alt,
			state,
			canvas,
			refs: { editorRef, aiTextareaRef, aiFileInputRef },
			hasCropSelection,
			cropDimensionLabel,
			handleModeChange,
			handleCropChange,
			handleApplyCrop,
			handleResetCrop,
			handleSave,
			handleCancel,
			handleAISubmit,
			handleAIButtonClick,
			handleCancelAI,
			handlePromptKeyDown,
			handleEditorKeyDown,
			handleAIFileInputChange,
			handleAIDragOver,
			handleAIDragLeave,
			handleAIDrop,
			setAIPrompt,
			setSelectedModelId,
			removeAIFile,
			openFilePicker,
		}),
		[
			src,
			alt,
			state,
			canvas,
			hasCropSelection,
			cropDimensionLabel,
			handleModeChange,
			handleCropChange,
			handleApplyCrop,
			handleResetCrop,
			handleSave,
			handleCancel,
			handleAISubmit,
			handleAIButtonClick,
			handleCancelAI,
			handlePromptKeyDown,
			handleEditorKeyDown,
			handleAIFileInputChange,
			handleAIDragOver,
			handleAIDragLeave,
			handleAIDrop,
			setAIPrompt,
			setSelectedModelId,
			removeAIFile,
			openFilePicker,
		]
	);

	return <ImageEditorContext.Provider value={value}>{children}</ImageEditorContext.Provider>;
}
