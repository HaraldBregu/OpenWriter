interface AIMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}
