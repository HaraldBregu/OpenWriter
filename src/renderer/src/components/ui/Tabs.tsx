import * as React from 'react';
import { cn } from 'src/renderer/src/lib/utils';

// ---------------------------------------------------------------------------
// TabsContext
// ---------------------------------------------------------------------------

interface TabsContextValue {
	activeTab: string;
	onTabChange: (tab: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(componentName: string): TabsContextValue {
	const ctx = React.useContext(TabsContext);
	if (!ctx) {
		throw new Error(`<${componentName}> must be used inside a <Tabs> component`);
	}
	return ctx;
}

// ---------------------------------------------------------------------------
// Tabs (root)
// ---------------------------------------------------------------------------

export interface TabsProps {
	value: string;
	onValueChange: (value: string) => void;
	className?: string;
	children: React.ReactNode;
}

export function Tabs({ value, onValueChange, className, children }: TabsProps): React.JSX.Element {
	const ctx = React.useMemo<TabsContextValue>(
		() => ({ activeTab: value, onTabChange: onValueChange }),
		[value, onValueChange]
	);

	return (
		<TabsContext.Provider value={ctx}>
			<div className={cn('flex flex-col h-full', className)}>{children}</div>
		</TabsContext.Provider>
	);
}

// ---------------------------------------------------------------------------
// TabsList
// ---------------------------------------------------------------------------

export interface TabsListProps {
	className?: string;
	children: React.ReactNode;
}

export function TabsList({ className, children }: TabsListProps): React.JSX.Element {
	return (
		<div
			role="tablist"
			className={cn('border-b px-6 flex gap-0 -mb-px shrink-0', className)}
		>
			{children}
		</div>
	);
}

// ---------------------------------------------------------------------------
// TabsTrigger
// ---------------------------------------------------------------------------

export interface TabsTriggerProps {
	value: string;
	className?: string;
	children: React.ReactNode;
}

const TRIGGER_BASE =
	'px-4 py-3 text-sm font-normal border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer';
const TRIGGER_ACTIVE = 'border-foreground text-foreground';
const TRIGGER_INACTIVE = 'border-transparent text-muted-foreground hover:text-foreground';

export function TabsTrigger({ value, className, children }: TabsTriggerProps): React.JSX.Element {
	const { activeTab, onTabChange } = useTabsContext('TabsTrigger');
	const isActive = activeTab === value;

	return (
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			tabIndex={isActive ? 0 : -1}
			onClick={() => onTabChange(value)}
			className={cn(
				TRIGGER_BASE,
				isActive ? TRIGGER_ACTIVE : TRIGGER_INACTIVE,
				className
			)}
		>
			{children}
		</button>
	);
}

// ---------------------------------------------------------------------------
// TabsContent
// ---------------------------------------------------------------------------

export interface TabsContentProps {
	value: string;
	className?: string;
	children: React.ReactNode;
}

export function TabsContent({ value, className, children }: TabsContentProps): React.JSX.Element | null {
	const { activeTab } = useTabsContext('TabsContent');

	if (activeTab !== value) return null;

	return (
		<div
			role="tabpanel"
			className={cn('flex-1 min-h-0', className)}
		>
			{children}
		</div>
	);
}
