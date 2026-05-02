import { jsx as _jsx } from "react/jsx-runtime";
export default function MessageList({ messages }) {
    if (messages.length === 0) {
        return (_jsx("div", { className: "flex h-full items-center justify-center text-sm text-muted-foreground", children: "Start a conversation with your assistant." }));
    }
    return (_jsx("div", { className: "flex flex-col gap-3 p-4", children: messages.map((m) => (_jsx("div", { className: m.role === 'user'
                ? 'self-end max-w-[80%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm'
                : 'self-start max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm', children: m.content }, m.id))) }));
}
