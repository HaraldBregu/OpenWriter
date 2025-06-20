export type EditorContextState = {
    selectedSideviewTabIndex: number;
    contentTocVisible: boolean;
    isFocused: boolean;
    activeEditor: number;
    characters: number;
    words: number;
    siglumSetupDialogVisible: boolean;
    fontFamilyList: string[];
    fontFamilySymbols: CharacterSet;
    siglumList: Siglum[];
    addSymbolVisible: boolean;
}

export const initialState: EditorContextState = {
    selectedSideviewTabIndex: 0,
    contentTocVisible: false,
    activeEditor: 0,
    isFocused: false,
    characters: 0,
    words: 0,
    siglumSetupDialogVisible: false,
    fontFamilyList: [],
    fontFamilySymbols: [],
    siglumList: [],
    addSymbolVisible: false
}