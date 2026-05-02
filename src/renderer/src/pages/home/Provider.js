import { jsx as _jsx } from "react/jsx-runtime";
import { useReducer, useMemo } from 'react';
import { homeReducer } from './context/reducer';
import { INITIAL_HOME_STATE } from './context/state';
import { HomeContext } from './context/context';
export function Provider({ children }) {
    const [state, dispatch] = useReducer(homeReducer, INITIAL_HOME_STATE);
    const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
    return _jsx(HomeContext.Provider, { value: value, children: children });
}
