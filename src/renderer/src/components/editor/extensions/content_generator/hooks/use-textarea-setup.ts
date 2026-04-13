import { useCallback, useEffect, useRef } from 'react';
import type React from 'react';

interface UseTextareaSetupParams {
	textareaRef: React.RefObject<HTMLTextAreaElement | null>;
	onSubmit: () => void;
	onDelete: () => void;
}

export function useTextareaSetup({ textareaRef, onSubmit, onDelete }: UseTextareaSetupParams) {
	const submitRef = useRef<(() => void) | null>(onSubmit);
	submitRef.current = onSubmit;
	const deleteRef = useRef(onDelete);
	deleteRef.current = onDelete;

	const resizeTextarea = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}, [textareaRef]);

	useEffect(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		requestAnimationFrame(() => {
			textarea.focus();
			resizeTextarea();
		});

		const handleKeyDown = (e: KeyboardEvent): void => {
			e.stopPropagation();
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				submitRef.current?.();
			} else if (e.key === 'Escape') {
				deleteRef.current();
			}
		};

		textarea.addEventListener('keydown', handleKeyDown);
		return () => textarea.removeEventListener('keydown', handleKeyDown);
	}, [resizeTextarea, textareaRef]);

	return { submitRef, resizeTextarea };
}
