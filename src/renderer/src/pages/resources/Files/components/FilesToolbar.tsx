import { Filter, Grid3x3, List, Search } from 'lucide-react';
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
		<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
			<ButtonGroup className="flex-1 gap-2">
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
				</InputGroup>

				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button variant={typeFilter === 'all' ? 'outline' : 'secondary'} size="lg" />}
					>
						<Filter className="h-4 w-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
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

				<ButtonGroup>
					<Button
						variant={viewMode === 'list' ? 'secondary' : 'outline'}
						size="lg"
						onClick={() => setViewMode('list')}
						aria-label="List view"
						aria-pressed={viewMode === 'list'}
					>
						<List className="h-4 w-4" />
					</Button>
					<Button
						variant={viewMode === 'grid' ? 'secondary' : 'outline'}
						size="lg"
						onClick={() => setViewMode('grid')}
						aria-label="Grid view"
						aria-pressed={viewMode === 'grid'}
					>
						<Grid3x3 className="h-4 w-4" />
					</Button>
				</ButtonGroup>
			</ButtonGroup>
		</div>
	);
}
