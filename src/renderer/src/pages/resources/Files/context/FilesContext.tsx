import { createContext } from 'react';
import type { FilesContextValue } from './types';

export const FilesContext = createContext<FilesContextValue | null>(null);
