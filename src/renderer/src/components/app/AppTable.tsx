import React from 'react';
import {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
} from '../ui/Table';
import { cn } from '@/lib/utils';

const AppTable = React.memo(
	React.forwardRef<React.ElementRef<typeof Table>, React.ComponentPropsWithoutRef<typeof Table>>(
		({ className, ...props }, ref) => (
			<Table ref={ref} className={cn('text-foreground', className)} {...props} />
		)
	)
);
AppTable.displayName = 'AppTable';

const AppTableHeader = React.memo(
	React.forwardRef<
		React.ElementRef<typeof TableHeader>,
		React.ComponentPropsWithoutRef<typeof TableHeader> & { sticky?: boolean }
	>(({ className, sticky, ...props }, ref) => (
		<TableHeader
			ref={ref}
			className={cn('bg-muted', sticky && 'sticky top-0 z-10', className)}
			{...props}
		/>
	))
);
AppTableHeader.displayName = 'AppTableHeader';

const AppTableBody = React.memo(
	React.forwardRef<
		React.ElementRef<typeof TableBody>,
		React.ComponentPropsWithoutRef<typeof TableBody>
	>(({ className, ...props }, ref) => <TableBody ref={ref} className={className} {...props} />)
);
AppTableBody.displayName = 'AppTableBody';

const AppTableFooter = React.memo(
	React.forwardRef<
		React.ElementRef<typeof TableFooter>,
		React.ComponentPropsWithoutRef<typeof TableFooter>
	>(({ className, ...props }, ref) => <TableFooter ref={ref} className={className} {...props} />)
);
AppTableFooter.displayName = 'AppTableFooter';

const AppTableHead = React.memo(
	React.forwardRef<
		React.ElementRef<typeof TableHead>,
		React.ComponentPropsWithoutRef<typeof TableHead>
	>(({ className, ...props }, ref) => (
		<TableHead ref={ref} className={cn('text-muted-foreground', className)} {...props} />
	))
);
AppTableHead.displayName = 'AppTableHead';

const AppTableRow = React.memo(
	React.forwardRef<
		React.ElementRef<typeof TableRow>,
		React.ComponentPropsWithoutRef<typeof TableRow>
	>(({ className, ...props }, ref) => <TableRow ref={ref} className={className} {...props} />)
);
AppTableRow.displayName = 'AppTableRow';

const AppTableCell = React.memo(
	React.forwardRef<
		React.ElementRef<typeof TableCell>,
		React.ComponentPropsWithoutRef<typeof TableCell>
	>(({ className, ...props }, ref) => <TableCell ref={ref} className={className} {...props} />)
);
AppTableCell.displayName = 'AppTableCell';

const AppTableCaption = React.memo(
	React.forwardRef<
		React.ElementRef<typeof TableCaption>,
		React.ComponentPropsWithoutRef<typeof TableCaption>
	>(({ className, ...props }, ref) => <TableCaption ref={ref} className={className} {...props} />)
);
AppTableCaption.displayName = 'AppTableCaption';

export {
	AppTable,
	AppTableHeader,
	AppTableBody,
	AppTableFooter,
	AppTableHead,
	AppTableRow,
	AppTableCell,
	AppTableCaption,
};
