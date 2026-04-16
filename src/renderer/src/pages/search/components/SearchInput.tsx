import React from 'react';
import { Search, X } from 'lucide-react';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/InputGroup';

interface SearchInputProps {
	readonly value: string;
	readonly placeholder: string;
	readonly onChange: (value: string) => void;
	readonly onClear: () => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, placeholder, onChange, onClear }) => {
	return (
		<InputGroup>
			<InputGroupAddon>
				<InputGroupText>
					<Search />
				</InputGroupText>
			</InputGroupAddon>
			<InputGroupInput
				autoFocus
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
			/>
			{value.trim().length > 0 && (
				<InputGroupAddon align="inline-end">
					<InputGroupButton size="icon-xs" onClick={onClear} aria-label="Clear search">
						<X />
					</InputGroupButton>
				</InputGroupAddon>
			)}
		</InputGroup>
	);
};

export { SearchInput };
