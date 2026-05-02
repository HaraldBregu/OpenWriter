export async function sendMessage(prompt) {
    const content = await window.assistant.send(prompt);
    return { content };
}
export function resetConversation() {
    return window.assistant.reset();
}
export function onAssistantResponse(callback) {
    return window.assistant.onResponse((event) => {
        callback({ content: event.response });
    });
}
