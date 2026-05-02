import { jsx as _jsx } from "react/jsx-runtime";
import { NodeViewWrapper } from '@tiptap/react';
import { Prompt } from '../../views/prompt/Prompt';
export function PromptNodeView(props) {
    return (_jsx(NodeViewWrapper, { contentEditable: false, children: _jsx(Prompt, { nodeViewProps: props }) }));
}
