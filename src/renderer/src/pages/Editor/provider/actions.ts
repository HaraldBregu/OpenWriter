export type EditorAction =
    | { type: 'TEST' }
    | { type: 'SET_ACTIVE_EDITOR'; payload: number }
    | { type: 'RESET_EDITOR' }
    | { type: 'SET_CONTENT_TOC_VISIBLE'; payload: boolean }
    | { type: 'SET_EDITOR_FOCUS'; payload: boolean }
    | { type: 'SET_SELECTED_SIDEVIEW_TAB_INDEX'; payload: number }
    | { type: 'SET_CHARACTERS'; payload: number }
    | { type: 'SET_WORDS'; payload: number }
    | { type: 'SET_SIGLUM_LIST'; payload: Siglum[] }
    | { type: 'SET_SIGLUM_LIST_FROM_FILE'; payload: DocumentSiglum[] }
    | { type: 'ADD_SIGLUM'; payload: { siglum: SiglumData, manuscripts: SiglumData, description: SiglumData } }
    | { type: 'UPDATE_SIGLUM'; payload: { id: string, siglum: SiglumData, manuscripts: SiglumData, description: SiglumData } }
    | { type: 'DUPLICATE_SIGLUM'; payload: Siglum }
    | { type: 'SET_SIGLUM_SETUP_DIALOG_VISIBLE'; payload: boolean }
    | { type: 'DELETE_SIGLUM'; payload: Siglum }
    | { type: 'SET_FONT_FAMILY_LIST'; payload: string[] }
    | { type: 'SET_FONT_FAMILY_SYMBOLS'; payload: CharacterSet }
    | { type: 'SET_ADD_SYMBOL_VISIBLE'; payload: boolean }


export const setSelectedSideviewTabIndex = (tab: number): EditorAction => ({
    type: 'SET_SELECTED_SIDEVIEW_TAB_INDEX',
    payload: tab
})

export const setCharacters = (characters: number): EditorAction => ({
    type: 'SET_CHARACTERS',
    payload: characters
})

export const setWords = (words: number): EditorAction => ({
    type: 'SET_WORDS',
    payload: words
})

export const setSiglumList = (siglumList: Siglum[]): EditorAction => ({
    type: 'SET_SIGLUM_LIST',
    payload: siglumList
})

export const setSiglumListFromFile = (siglumList: DocumentSiglum[]): EditorAction => ({
    type: 'SET_SIGLUM_LIST_FROM_FILE',
    payload: siglumList
})

export const addSiglum = (siglum: SiglumData, manuscripts: SiglumData, description: SiglumData): EditorAction => ({
    type: 'ADD_SIGLUM',
    payload: { siglum, manuscripts, description }
})

export const updateSiglum = (id: string, siglum: SiglumData, manuscripts: SiglumData, description: SiglumData): EditorAction => ({
    type: 'UPDATE_SIGLUM',
    payload: { id, siglum, manuscripts, description }
})

export const duplicateSiglum = (siglum: Siglum): EditorAction => ({
    type: 'DUPLICATE_SIGLUM',
    payload: siglum
})

export const setSiglumSetupDialogVisible = (visible: boolean): EditorAction => ({
    type: 'SET_SIGLUM_SETUP_DIALOG_VISIBLE',
    payload: visible
})

export const deleteSiglum = (siglum: Siglum): EditorAction => ({
    type: 'DELETE_SIGLUM',
    payload: siglum
})

export const setFontFamilyList = (fontFamilyList: string[]): EditorAction => ({
    type: 'SET_FONT_FAMILY_LIST',
    payload: fontFamilyList
})

export const setFontFamilySymbols = (fontFamilySymbols: CharacterSet): EditorAction => ({
    type: 'SET_FONT_FAMILY_SYMBOLS',
    payload: fontFamilySymbols
})

export const setEditorFocus = (isFocused: boolean): EditorAction => ({
    type: 'SET_EDITOR_FOCUS',
    payload: isFocused
})

export const setAddSymbolVisible = (visible: boolean): EditorAction => ({
    type: 'SET_ADD_SYMBOL_VISIBLE',
    payload: visible
})