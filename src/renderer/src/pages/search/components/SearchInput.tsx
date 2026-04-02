import React from 'react';
import { Search, X } from 'lucide-react';
import { AppInput } from '@/components/app';

interface SearchInputProps {
	value: string;
	placeholder: string;
	onChange: (value: string) => void;
	onClear: () => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, placeholder, onChange, onClear }) => {
	return (
		<div className="relative">
			<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<AppInput
				autoFocus
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="h-12 rounded-2xl bg-background pl-11 pr-11 text-sm"
			/>
			{value.trim().length > 0 && (
				<button
					type="button"
					onClick={onClear}
					className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	);
};

export { SearchInput };
