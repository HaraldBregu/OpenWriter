import { useRender } from '@base-ui/react/use-render';
import * as React from 'react';
type Direction = 'ltr' | 'rtl';
interface FileState {
    file: File;
    progress: number;
    error?: string;
    status: 'idle' | 'uploading' | 'error' | 'success';
}
interface StoreState {
    files: Map<File, FileState>;
    dragOver: boolean;
    invalid: boolean;
}
declare function useStore<T>(selector: (state: StoreState) => T): T;
interface FileUploadProps extends Omit<React.ComponentProps<'div'> & useRender.ComponentProps<'div'>, 'defaultValue' | 'onChange'> {
    value?: File[];
    defaultValue?: File[];
    onValueChange?: (files: File[]) => void;
    onAccept?: (files: File[]) => void;
    onFileAccept?: (file: File) => void;
    onFileReject?: (file: File, message: string) => void;
    onFileValidate?: (file: File) => string | null | undefined;
    onUpload?: (files: File[], options: {
        onProgress: (file: File, progress: number) => void;
        onSuccess: (file: File) => void;
        onError: (file: File, error: Error) => void;
    }) => Promise<void> | void;
    accept?: string;
    maxFiles?: number;
    maxSize?: number;
    dir?: Direction;
    label?: string;
    name?: string;
    disabled?: boolean;
    invalid?: boolean;
    multiple?: boolean;
    required?: boolean;
}
declare function FileUpload(props: FileUploadProps): import("react/jsx-runtime").JSX.Element;
interface FileUploadDropzoneProps extends React.ComponentProps<'div'>, useRender.ComponentProps<'div'> {
}
declare function FileUploadDropzone(props: FileUploadDropzoneProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
interface FileUploadTriggerProps extends React.ComponentProps<'button'>, useRender.ComponentProps<'button'> {
}
declare function FileUploadTrigger(props: FileUploadTriggerProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>;
interface FileUploadListProps extends React.ComponentProps<'div'>, useRender.ComponentProps<'div'> {
    orientation?: 'horizontal' | 'vertical';
    forceMount?: boolean;
}
declare function FileUploadList(props: FileUploadListProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | null;
interface FileUploadItemProps extends React.ComponentProps<'div'>, useRender.ComponentProps<'div'> {
    value: File;
}
declare function FileUploadItem(props: FileUploadItemProps): import("react/jsx-runtime").JSX.Element | null;
interface FileUploadItemPreviewProps extends React.ComponentProps<'div'>, useRender.ComponentProps<'div'> {
    previewRender?: (file: File, fallback: () => React.ReactNode) => React.ReactNode;
}
declare function FileUploadItemPreview(props: FileUploadItemPreviewProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | null;
interface FileUploadItemMetadataProps extends React.ComponentProps<'div'>, useRender.ComponentProps<'div'> {
    size?: 'default' | 'sm';
}
declare function FileUploadItemMetadata(props: FileUploadItemMetadataProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | null;
interface FileUploadItemProgressProps extends React.ComponentProps<'div'>, useRender.ComponentProps<'div'> {
    variant?: 'linear' | 'circular' | 'fill';
    size?: number;
    forceMount?: boolean;
}
declare function FileUploadItemProgress(props: FileUploadItemProgressProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | null;
interface FileUploadItemDeleteProps extends React.ComponentProps<'button'>, useRender.ComponentProps<'button'> {
}
declare function FileUploadItemDelete(props: FileUploadItemDeleteProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | null;
interface FileUploadClearProps extends React.ComponentProps<'button'>, useRender.ComponentProps<'button'> {
    forceMount?: boolean;
}
declare function FileUploadClear(props: FileUploadClearProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | null;
export { FileUpload, FileUploadClear, FileUploadDropzone, FileUploadItem, FileUploadItemDelete, FileUploadItemMetadata, FileUploadItemPreview, FileUploadItemProgress, FileUploadList, type FileUploadProps, FileUploadTrigger, useStore as useFileUpload, };
