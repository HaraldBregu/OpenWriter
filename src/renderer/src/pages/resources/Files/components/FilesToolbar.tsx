import { ChevronDownIcon, Filter, Grid3x3, List, Search } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
} from '@/components/ui/InputGroup';
import { FILE_TYPE_FILTERS } from '../types';
import type { FileTypeFilter } from '../types';
import { useFilesContext } from '../context/FilesContext';

export function FilesToolbar(): ReactElement {
	const { searchQuery, setSearchQuery, viewMode, setViewMode, typeFilter, setTypeFilter } =
		useFilesContext();

	return (
		<div className="flex shrink-0 items-center gap-4 border-b px-6 py-4">
			<ButtonGroup className="min-w-0 flex-1">
				<InputGroup>
					<InputGroupAddon>
						<InputGroupText>
							<Search />
						</InputGroupText>
					</InputGroupAddon>
					<InputGroupInput
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Start typing to search"
					/>
					<InputGroupAddon align="inline-end">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<InputGroupButton variant="ghost" className="pr-1.5! text-xs">
										Filter <ChevronDownIcon className="size-3" />
									</InputGroupButton>
								}
							>
								<Filter className="h-4 w-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" sideOffset={8} alignOffset={-4}>
								<DropdownMenuRadioGroup
									value={typeFilter}
									onValueChange={(value) => setTypeFilter(value as FileTypeFilter)}
								>
									{FILE_TYPE_FILTERS.map(({ value, label }) => (
										<DropdownMenuRadioItem key={value} value={value}>
											{label}
										</DropdownMenuRadioItem>
									))}
								</DropdownMenuRadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</InputGroupAddon>
				</InputGroup>
			</ButtonGroup>
			<ButtonGroup className="shrink-0">
				<Button
					variant={viewMode === 'list' ? 'outline-selected' : 'outline'}
					size="icon"
					onClick={() => setViewMode('list')}
					aria-label="List view"
					aria-pressed={viewMode === 'list'}
				>
					<List className="h-4 w-4" />
				</Button>
				<Button
					variant={viewMode === 'grid' ? 'outline-selected' : 'outline'}
					size="icon"
					onClick={() => setViewMode('grid')}
					aria-label="Grid view"
					aria-pressed={viewMode === 'grid'}
				>
					<Grid3x3 className="h-4 w-4" />
				</Button>
			</ButtonGroup>
		</div>
	);
}
