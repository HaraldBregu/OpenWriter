import { jsx as _jsx } from "react/jsx-runtime";
import { NodeViewWrapper } from '@tiptap/react';
import { ImageView } from '../../views/image';
export function ImageNodeView(props) {
    return (_jsx(NodeViewWrapper, { contentEditable: false, className: "my-4", children: _jsx(ImageView, { nodeViewProps: props }) }));
}
