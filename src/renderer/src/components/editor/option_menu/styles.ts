import type { MenuItem } from './menu-items';

export const menuContainerClass =
	'z-50 flex min-w-[220px] flex-col rounded-xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-[0_18px_40px_hsl(var(--foreground)/0.14)] ring-1 ring-black/5 backdrop-blur-md dark:border-border dark:bg-popover dark:ring-[hsl(var(--border)/0.7)] dark:shadow-[0_18px_44px_hsl(0_0%_0%/0.46)]';

export function getItemClass(isSelected: boolean): string {
	return isSelected
		? 'bg-accent text-foreground shadow-sm ring-1 ring-border/70 dark:bg-accent/95 dark:text-foreground dark:ring-[hsl(var(--border)/0.7)]'
		: 'text-popover-foreground hover:bg-accent/95 hover:text-foreground dark:text-popover-foreground dark:hover:bg-accent dark:hover:text-foreground';
}

export function getIconClass(tone: MenuItem['tone'], isSelected: boolean): string {
	if (tone === 'ai') {
		return isSelected
			? 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))] shadow-sm'
			: 'bg-[hsl(var(--info)/0.16)] text-[hsl(var(--info))] dark:bg-[hsl(var(--info)/0.22)] dark:text-[hsl(var(--info))]';
	}

	return isSelected
		? 'bg-background/80 text-foreground shadow-sm dark:bg-background/70 dark:text-foreground'
		: 'text-foreground/72 dark:text-foreground/82';
}
