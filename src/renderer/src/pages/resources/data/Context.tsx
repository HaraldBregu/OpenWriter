import { createContext } from 'react';
import type { DataContextValue } from './context/types';

export const Context = createContext<DataContextValue | null>(null);
