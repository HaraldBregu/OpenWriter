import { createContext, type Dispatch } from 'react';
import type { InfoAction } from './actions';
import type { InfoState } from './state';

export const InfoStateContext = createContext<InfoState | null>(null);
export const InfoDispatchContext = createContext<Dispatch<InfoAction> | null>(null);
