import { createSelector, createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  providerId: string
  createdAt: number
  updatedAt: number
}

interface ChatState {
  threads: ChatThread[]
  activeThreadId: string | null
  isAgentRunning: boolean
  runningThreadId: string | null
}

const initialState: ChatState = {
  threads: [],
  activeThreadId: null,
  isAgentRunning: false,
  runningThreadId: null
}

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    createThread: {
      reducer(state, action: PayloadAction<ChatThread>) {
        state.threads.unshift(action.payload)
        state.activeThreadId = action.payload.id
      },
      prepare(providerId: string) {
        return {
          payload: {
            id: nanoid(),
            title: 'New Thread',
            messages: [],
            providerId,
            createdAt: Date.now(),
            updatedAt: Date.now()
          } satisfies ChatThread
        }
      }
    },

    setActiveThread(state, action: PayloadAction<string>) {
      state.activeThreadId = action.payload
    },

    addUserMessage(
      state,
      action: PayloadAction<{ threadId: string; content: string }>
    ) {
      const thread = state.threads.find((t) => t.id === action.payload.threadId)
      if (!thread) return
      thread.messages.push({
        id: nanoid(),
        role: 'user',
        content: action.payload.content,
        timestamp: Date.now()
      })
      thread.updatedAt = Date.now()
      // Auto-title from first user message
      if (thread.title === 'New Thread') {
        thread.title = action.payload.content.slice(0, 50)
      }
    },

    addAssistantMessage(state, action: PayloadAction<{ threadId: string }>) {
      const thread = state.threads.find((t) => t.id === action.payload.threadId)
      if (!thread) return
      thread.messages.push({
        id: nanoid(),
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      })
      thread.updatedAt = Date.now()
    },

    appendToken(
      state,
      action: PayloadAction<{ threadId: string; token: string }>
    ) {
      const thread = state.threads.find((t) => t.id === action.payload.threadId)
      if (!thread) return
      const last = thread.messages[thread.messages.length - 1]
      if (last?.role === 'assistant') {
        last.content += action.payload.token
        thread.updatedAt = Date.now()
      }
    },

    deleteThread(state, action: PayloadAction<string>) {
      state.threads = state.threads.filter((t) => t.id !== action.payload)
      if (state.activeThreadId === action.payload) {
        state.activeThreadId = state.threads[0]?.id ?? null
      }
    },

    updateThreadProvider(
      state,
      action: PayloadAction<{ threadId: string; providerId: string }>
    ) {
      const thread = state.threads.find((t) => t.id === action.payload.threadId)
      if (thread) {
        thread.providerId = action.payload.providerId
      }
    },

    setAgentRunning(
      state,
      action: PayloadAction<{ running: boolean; threadId?: string }>
    ) {
      state.isAgentRunning = action.payload.running
      state.runningThreadId = action.payload.running ? (action.payload.threadId ?? null) : null
    }
  }
})

export const {
  createThread,
  setActiveThread,
  addUserMessage,
  addAssistantMessage,
  appendToken,
  deleteThread,
  updateThreadProvider,
  setAgentRunning
} = chatSlice.actions

// Selectors
export const selectThreads = (state: { chat: ChatState }): ChatThread[] => state.chat.threads
export const selectActiveThreadId = (state: { chat: ChatState }): string | null =>
  state.chat.activeThreadId

export const selectActiveThread = createSelector(
  [selectThreads, selectActiveThreadId],
  (threads, activeId): ChatThread | null =>
    threads.find((t) => t.id === activeId) ?? null
)

export const selectActiveThreadMessages = createSelector(
  [selectActiveThread],
  (thread): ChatMessage[] => thread?.messages ?? []
)

export const selectThreadById = (id: string) =>
  createSelector([selectThreads], (threads) => threads.find((t) => t.id === id) ?? null)

export const selectIsAgentRunning = (state: { chat: ChatState }): boolean =>
  state.chat.isAgentRunning
export const selectRunningThreadId = (state: { chat: ChatState }): string | null =>
  state.chat.runningThreadId

export default chatSlice.reducer
