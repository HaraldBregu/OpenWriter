import type { ReactElement } from 'react';
export type ExtractorType = 'image' | 'pdf';
declare const EXTRA_OPTIONS: readonly [{
    readonly value: "descrizione";
    readonly label: "Descrizione";
}, {
    readonly value: "didascalia";
    readonly label: "Didascalia";
}, {
    readonly value: "metadati";
    readonly label: "Metadati";
}];
type ExtraValue = (typeof EXTRA_OPTIONS)[number]['value'];
export interface ExtractorRunPayload {
    readonly type: ExtractorType;
    readonly file: File;
    readonly fileName: string;
    readonly filePath: string | null;
    readonly fileSrc: string;
    readonly modelId: string;
    readonly extras: readonly ExtraValue[];
    readonly outputFileName: string;
}
interface ExtractorDialogProps {
    readonly open: boolean;
    readonly onOpenChange: (open: boolean) => void;
    readonly onRun?: (payload: ExtractorRunPayload) => void | Promise<void>;
}
export declare function ExtractorDialog({ open, onOpenChange, onRun }: ExtractorDialogProps): ReactElement;
export {};
