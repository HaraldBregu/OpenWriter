export type SidebarSide = 'left' | 'right';

export interface PageState {
	readonly isSidebarVisible: boolean;
	readonly sidebarSide: SidebarSide;
	readonly isHeaderVisible: boolean;
	readonly sidebarOpen: boolean;
	readonly sidebarOpenMobile: boolean;
}

export const INITIAL_PAGE_STATE: PageState = {
	isSidebarVisible: true,
	sidebarSide: 'left',
	isHeaderVisible: true,
	sidebarOpen: true,
	sidebarOpenMobile: false,
};
