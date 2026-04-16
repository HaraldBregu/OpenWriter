import { createContext } from 'react';
import type { DataContextValue } from './types';

export const Context = createContext<DataContextValue | null>(null);
