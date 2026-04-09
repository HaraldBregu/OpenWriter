import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Unlock } from 'lucide-react';
import { AppButton } from '@/components/app/AppButton';
import { AppTooltip, AppTooltipContent, AppTooltipTrigger } from '@/components/app/AppTooltip';
import { MAX_DIMENSION, MIN_DIMENSION } from '../shared';

interface ResizeControlsProps {
	currentWidth: number;
	currentHeight: number;
	onApply: (width: number, height: number) => void;
}

export function ResizeControls({
	currentWidth,
	currentHeight,
	onApply,
}: ResizeControlsProps): React.JSX.Element {
	const { t } = useTranslation();
	const [widthInput, setWidthInput] = useState(String(currentWidth));
	const [heightInput, setHeightInput] = useState(String(currentHeight));
	const [isLocked, setIsLocked] = useState(true);
	const aspectRatioRef = useRef(currentWidth / currentHeight);

	useEffect(() => {
		setWidthInput(String(currentWidth));
		setHeightInput(String(currentHeight));
		if (currentHeight > 0) {
			aspectRatioRef.current = currentWidth / currentHeight;
		}
	}, [currentWidth, currentHeight]);

	const clampDimension = useCallback(
		(value: number): number => Math.round(Math.min(Math.max(value, MIN_DIMENSION), MAX_DIMENSION)),
		[]
	);

	const handleWidthChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const raw = e.target.value;
			setWidthInput(raw);
			const parsed = parseInt(raw, 10);
			if (!isNaN(parsed) && isLocked) {
				const newHeight = clampDimension(parsed / aspectRatioRef.current);
				setHeightInput(String(newHeight));
			}
		},
		[clampDimension, isLocked]
	);

	const handleHeightChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const raw = e.target.value;
			setHeightInput(raw);
			const parsed = parseInt(raw, 10);
			if (!isNaN(parsed) && isLocked) {
				const newWidth = clampDimension(parsed * aspectRatioRef.current);
				setWidthInput(String(newWidth));
			}
		},
		[clampDimension, isLocked]
	);

	const handleApply = useCallback((): void => {
		const w = clampDimension(parseInt(widthInput, 10) || currentWidth);
		const h = clampDimension(parseInt(heightInput, 10) || currentHeight);
		onApply(w, h);
	}, [clampDimension, currentHeight, currentWidth, heightInput, onApply, widthInput]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>): void => {
			if (e.key === 'Enter') handleApply();
		},
		[handleApply]
	);

	const toggleLock = useCallback((): void => {
		if (!isLocked && currentHeight > 0) {
			aspectRatioRef.current = currentWidth / currentHeight;
		}
		setIsLocked((prev) => !prev);
	}, [currentHeight, currentWidth, isLocked]);

	return (
		<div className="flex flex-wrap items-end gap-2">
			<span id="resize-dimensions-hint" className="sr-only">
				{t('imageNode.resizeDimensionsHint', {
					min: MIN_DIMENSION,
					max: MAX_DIMENSION,
					defaultValue: `Enter a value between ${MIN_DIMENSION} and ${MAX_DIMENSION}`,
				})}
			</span>

			<div className="flex flex-col gap-1">
				<label className="text-xs text-muted-foreground" htmlFor="resize-width">
					{t('imageNode.width')}
				</label>
				<input
					id="resize-width"
					type="number"
					min={MIN_DIMENSION}
					max={MAX_DIMENSION}
					value={widthInput}
					onChange={handleWidthChange}
					onKeyDown={handleKeyDown}
					aria-describedby="resize-dimensions-hint"
					className="h-7 w-20 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>

			<AppTooltip>
				<AppTooltipTrigger
					render={
						<AppButton
							variant="ghost"
							size="icon-xs"
							aria-label={
								isLocked ? t('imageNode.unlockAspectRatio') : t('imageNode.lockAspectRatio')
							}
							aria-pressed={isLocked}
							onClick={toggleLock}
							className="mb-0.5"
						>
							{isLocked ? <Lock /> : <Unlock />}
						</AppButton>
					}
				/>
				<AppTooltipContent side="top" className="px-2 py-1 text-xs">
					{isLocked ? t('imageNode.unlockAspectRatio') : t('imageNode.lockAspectRatio')}
				</AppTooltipContent>
			</AppTooltip>

			<div className="flex flex-col gap-1">
				<label className="text-xs text-muted-foreground" htmlFor="resize-height">
					{t('imageNode.height')}
				</label>
				<input
					id="resize-height"
					type="number"
					min={MIN_DIMENSION}
					max={MAX_DIMENSION}
					value={heightInput}
					onChange={handleHeightChange}
					onKeyDown={handleKeyDown}
					aria-describedby="resize-dimensions-hint"
					className="h-7 w-20 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</div>

			<AppButton
				size="sm"
				onClick={handleApply}
				aria-label={t('imageNode.applyResize', 'Apply resize')}
				className="mb-0.5 h-7 rounded-full px-2 text-xs"
			>
				{t('imageNode.resize')}
			</AppButton>
		</div>
	);
}
