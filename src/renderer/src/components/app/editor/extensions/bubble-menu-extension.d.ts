import { Extension } from '@tiptap/core';
import { type BubbleMenuPluginProps } from '../plugins/bubble-menu-plugin';
export type BubbleMenuExtensionOptions = Omit<BubbleMenuPluginProps, 'editor'>;
export declare const BubbleMenuExtension: Extension<BubbleMenuExtensionOptions, any>;
