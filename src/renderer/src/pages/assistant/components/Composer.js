import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
export default function Composer({ value, disabled, onChange, onSubmit, }) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };
    return (_jsxs("div", { className: "flex items-center gap-2 border-t bg-background p-3", children: [_jsx(Input, { value: value, onChange: (e) => onChange(e.target.value), onKeyDown: handleKeyDown, placeholder: "Ask the assistant...", disabled: disabled }), _jsx(Button, { onClick: onSubmit, disabled: disabled || !value.trim(), children: "Send" })] }));
}
