import { createContext, Dispatch } from "react";
import { EditorContextState, initialState } from "./state";
import { EditorAction } from "./actions";

export const editorContext = createContext<[EditorContextState, Dispatch<EditorAction>]>([initialState, () => {}]);
