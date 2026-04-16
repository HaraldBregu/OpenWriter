export interface HoveredBlock {
	node: HTMLElement;
	pos: number;
	top: number;
}

export interface EditorState {
	hoveredBlock: HoveredBlock | null;
	imageDialogOpen: boolean;
}
