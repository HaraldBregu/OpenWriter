import { jsx as _jsx } from "react/jsx-runtime";
import { useReducer, useMemo } from 'react';
import { assistantReducer } from './context/reducer';
import { INITIAL_ASSISTANT_STATE } from './context/state';
import { AssistantContext } from './context/context';
export function Provider({ children }) {
    const [state, dispatch] = useReducer(assistantReducer, INITIAL_ASSISTANT_STATE);
    const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
    return _jsx(AssistantContext.Provider, { value: value, children: children });
}
