import type { ReactElement } from 'react';
import type { AssistantMessage } from '../context/state';
interface MessageListProps {
    readonly messages: readonly AssistantMessage[];
}
export default function MessageList({ messages }: MessageListProps): ReactElement;
export {};
