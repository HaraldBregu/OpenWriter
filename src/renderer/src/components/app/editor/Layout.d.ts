import { type ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
interface LayoutProps {
    readonly id?: string;
    readonly className?: string;
    readonly editor: Editor | null;
    readonly onImageInsert?: (result: {
        src: string;
        alt: string;
        title: string;
    }) => void;
    readonly children: ReactNode;
}
declare const Layout: import("react").ForwardRefExoticComponent<LayoutProps & import("react").RefAttributes<HTMLDivElement>>;
export default Layout;
