import { createContext } from 'react';
import type { FilesContextValue } from './types';

export const Context = createContext<FilesContextValue | null>(null);
