import type { ReactElement } from 'react';
interface ComposerProps {
    readonly value: string;
    readonly disabled?: boolean;
    readonly onChange: (value: string) => void;
    readonly onSubmit: () => void;
}
export default function Composer({ value, disabled, onChange, onSubmit, }: ComposerProps): ReactElement;
export {};
