export interface ImageState {
	loadError: boolean;
	hovered: boolean;
	focused: boolean;
	editing: boolean;
	editInitialMode: 'ai' | undefined;
	previewing: boolean;
}
