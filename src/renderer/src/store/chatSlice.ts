import { createSlice } from '@reduxjs/toolkit'

interface ChatState {
  // Placeholder — extend as the chat feature grows.
}

const initialState: ChatState = {}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {}
})

export default chatSlice.reducer
