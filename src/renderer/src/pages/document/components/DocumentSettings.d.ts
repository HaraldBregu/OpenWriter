interface DocumentSettingsProps {
    readonly documentId: string | null;
    readonly title: string;
    readonly content: string;
}
export default function DocumentSettings({ documentId, }: DocumentSettingsProps): React.ReactElement;
export {};
