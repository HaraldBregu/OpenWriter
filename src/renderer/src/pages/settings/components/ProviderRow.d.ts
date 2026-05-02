import React from 'react';
import type { ProviderId } from '../../../../../shared/types';
interface ProviderRowProps {
    readonly provider: ProviderId;
    readonly existingKey: string;
    readonly onSave: (provider: ProviderId, apiKey: string) => Promise<void>;
}
export declare const ProviderRow: React.FC<ProviderRowProps>;
export {};
