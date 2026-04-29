import { createContext } from 'react';
import type { FilesContextValue } from './context/types';

export const Context = createContext<FilesContextValue | null>(null);
