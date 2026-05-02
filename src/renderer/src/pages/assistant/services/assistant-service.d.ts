export interface AssistantReply {
    readonly content: string;
}
export declare function sendMessage(prompt: string): Promise<AssistantReply>;
export declare function resetConversation(): Promise<void>;
export declare function onAssistantResponse(callback: (reply: AssistantReply) => void): () => void;
