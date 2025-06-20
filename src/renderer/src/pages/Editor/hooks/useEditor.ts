import { useContext } from "react";
import { editorContext } from "../provider/context";

export const useEditor = () => {
    const context = useContext(editorContext);
    if (context === undefined) {
        throw new Error('useEditor must be used within a EditorContextProvider');
    }

    return context;
};