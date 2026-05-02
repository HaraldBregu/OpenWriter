import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { PageContainer, PageHeader, PageHeaderTitle, } from '@/components/app';
import { PageBody } from '@/components/app/base/page';
import Layout from './Layout';
import MessageList from './components/MessageList';
import Composer from './components/Composer';
import { useDispatch, useState } from './hooks';
import { sendMessage } from './services/assistant-service';
import { ASSISTANT_TITLE } from './shared';
function PageContent() {
    const { messages, input, isRunning } = useState();
    const dispatch = useDispatch();
    const handleInputChange = useCallback((value) => {
        dispatch({ type: 'INPUT_CHANGED', value });
    }, [dispatch]);
    const handleSubmit = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isRunning)
            return;
        dispatch({
            type: 'MESSAGE_APPENDED',
            message: { id: crypto.randomUUID(), role: 'user', content: trimmed },
        });
        dispatch({ type: 'INPUT_CHANGED', value: '' });
        dispatch({ type: 'RUN_STARTED' });
        try {
            const reply = await sendMessage(trimmed);
            dispatch({
                type: 'MESSAGE_APPENDED',
                message: { id: crypto.randomUUID(), role: 'assistant', content: reply.content },
            });
        }
        finally {
            dispatch({ type: 'RUN_FINISHED' });
        }
    }, [dispatch, input, isRunning]);
    return (_jsxs(PageContainer, { children: [_jsx(PageHeader, { children: _jsx(PageHeaderTitle, { children: _jsx("span", { className: "text-md font-medium tracking-tight", children: ASSISTANT_TITLE }) }) }), _jsxs(PageBody, { className: "flex flex-col p-0", children: [_jsx("div", { className: "flex-1 overflow-y-auto", children: _jsx(MessageList, { messages: messages }) }), _jsx(Composer, { value: input, disabled: isRunning, onChange: handleInputChange, onSubmit: handleSubmit })] })] }));
}
export default function Page() {
    return (_jsx(Layout, { children: _jsx(PageContent, {}) }));
}
