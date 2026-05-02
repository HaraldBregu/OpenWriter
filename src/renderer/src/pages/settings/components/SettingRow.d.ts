import React from 'react';
interface SettingRowProps {
    readonly label: string;
    readonly description?: string;
    readonly labelFor?: string;
    readonly children: React.ReactNode;
}
export declare const SettingRow: React.FC<SettingRowProps>;
export {};
