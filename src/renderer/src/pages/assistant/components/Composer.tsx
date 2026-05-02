import type { ReactElement, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ComposerProps {
	readonly value: string;
	readonly disabled?: boolean;
	readonly onChange: (value: string) => void;
	readonly onSubmit: () => void;
}

export default function Composer({
	value,
	disabled,
	onChange,
	onSubmit,
}: ComposerProps): ReactElement {
	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			onSubmit();
		}
	};

	return (
		<div className="flex items-center gap-2 border-t bg-background p-3">
			<Input
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Ask the assistant..."
				disabled={disabled}
			/>
			<Button onClick={onSubmit} disabled={disabled || !value.trim()}>
				Send
			</Button>
		</div>
	);
}
