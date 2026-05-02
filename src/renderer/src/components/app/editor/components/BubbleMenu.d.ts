import React from 'react';
import type { PromptSubmitPayload } from '../types';
export interface BubbleMenuProps {
    onPromptSubmit?: (payload: PromptSubmitPayload) => void;
}
export declare const BubbleMenu: React.NamedExoticComponent<BubbleMenuProps>;
