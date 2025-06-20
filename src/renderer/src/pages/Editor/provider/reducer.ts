import { EditorAction } from "./actions";
import { EditorContextState } from "./state";
import { v4 as uuidv4 } from 'uuid';

export const reducer = (
    state: EditorContextState,
    action: EditorAction): EditorContextState => {
    switch (action.type) {
        case 'TEST':
            return {
                ...state,
                activeEditor: state.activeEditor + 1
            };
        case 'SET_ACTIVE_EDITOR':
            return {
                ...state,
                activeEditor: action.payload
            };
        case 'RESET_EDITOR':
            return { ...state, activeEditor: 0 };
        case 'SET_EDITOR_FOCUS':
            return { ...state, isFocused: action.payload }
        case 'SET_SELECTED_SIDEVIEW_TAB_INDEX':
            return { ...state, selectedSideviewTabIndex: action.payload };
        case 'SET_CHARACTERS':
            return { ...state, characters: action.payload };
        case 'SET_WORDS':
            return { ...state, words: action.payload };
        case 'SET_SIGLUM_LIST':
            return { ...state, siglumList: action.payload };
        case 'SET_SIGLUM_LIST_FROM_FILE': {
            const siglumListFromFile = action.payload
            const siglumList = state.siglumList

            // Check if one or more siglumlistFromFile item is already in siglumList
            // @TODO: manage the duplicate of symbols
            const hasSameSiglum = siglumListFromFile.some(item => siglumList.some(siglum => siglum.siglum.value === item.siglum.value))
            console.log("hasSameSiglum", hasSameSiglum)
            // if (hasSameSiglum) {
            //     return {
            //         ...state,
            //         siglumList: siglumList
            //     }
            // }

            // const siglumPattern = new RegExp(`^${siglum.siglum.value}_\\d+$`);
            // const matchingSiglum = siglumList.filter(siglum => siglumPattern.test(siglum.siglum.value));
            // const lastSortedNumber = matchingSiglum.length + 1
            // const newSiglumValue = `${siglum.siglum.value}_${lastSortedNumber}`

            // const newSiglum = hasSameSiglum ? {
            //     ...siglum,
            //     id: uuidv4(),
            //     siglum: {
            //         ...siglum.siglum,
            //         value: newSiglumValue,
            //         content: newSiglumValue
            //     }
            // } : {
            //     ...siglum,
            //     id: uuidv4(),
            // }



            return {
                ...state,
                siglumList: action.payload.map(item => ({
                    ...item,
                    id: uuidv4(),
                    siglum: item.siglum,
                    manuscripts: item.manuscripts,
                    description: item.description
                }))
            };
        }
        case 'ADD_SIGLUM':
            return {
                ...state, siglumList: [
                    ...state.siglumList,
                    {
                        ...action.payload,
                        id: uuidv4(),
                        siglum: action.payload.siglum,
                        manuscripts: action.payload.manuscripts,
                        description: action.payload.description
                    }
                ]
            };
        case 'UPDATE_SIGLUM': {
            const siglumList = state.siglumList.map(siglum => {
                if (siglum.id === action.payload.id) {
                    return {
                        ...siglum,
                        siglum: action.payload.siglum,
                        manuscripts: action.payload.manuscripts,
                        description: action.payload.description
                    }
                }
                return siglum
            })

            return {
                ...state,
                siglumList: siglumList
            }
        }
        case 'DUPLICATE_SIGLUM': {
            const siglum = action.payload
            const siglumList = state.siglumList

            const hasSameSiglum = siglumList.some(item => item.siglum.value === siglum.siglum.value)
            const siglumPattern = new RegExp(`^${siglum.siglum.value}_\\d+$`);
            const matchingSiglum = siglumList.filter(siglum => siglumPattern.test(siglum.siglum.value));
            const lastSortedNumber = matchingSiglum.length + 1
            const newSiglumValue = `${siglum.siglum.value}_${lastSortedNumber}`

            const newSiglum = hasSameSiglum ? {
                ...siglum,
                id: uuidv4(),
                siglum: {
                    ...siglum.siglum,
                    value: newSiglumValue,
                    content: newSiglumValue
                }
            } : {
                ...siglum,
                id: uuidv4(),
            }

            return {
                ...state,
                siglumList: [
                    ...state.siglumList,
                    newSiglum
                ]
            };
        }
        case 'SET_SIGLUM_SETUP_DIALOG_VISIBLE':
            return { ...state, siglumSetupDialogVisible: action.payload };
        case 'DELETE_SIGLUM':
            return { ...state, siglumList: state.siglumList.filter(siglum => siglum.id !== action.payload.id) };
        case 'SET_FONT_FAMILY_LIST':
            return { ...state, fontFamilyList: action.payload };
        case 'SET_FONT_FAMILY_SYMBOLS':
            return { ...state, fontFamilySymbols: action.payload };
        case 'SET_ADD_SYMBOL_VISIBLE':
            return { ...state, addSymbolVisible: action.payload };
        default:
            return state;
    }
}