import { createContext, type Dispatch } from 'react';
import type { ChatAction } from './actions';
import type { ChatSession } from '../shared';

export const ChatStateContext = createContext<ChatSession | null>(null);
export const ChatDispatchContext = createContext<Dispatch<ChatAction> | null>(null);
