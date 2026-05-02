import { jsx as _jsx } from "react/jsx-runtime";
import { NodeViewWrapper } from '@tiptap/react';
import { Placeholder } from '../../views/placeholder/Placeholder';
export function PlaceholderNodeView(props) {
    return (_jsx(NodeViewWrapper, { contentEditable: false, children: _jsx(Placeholder, { nodeViewProps: props }) }));
}
