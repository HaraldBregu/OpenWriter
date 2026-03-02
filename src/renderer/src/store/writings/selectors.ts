/** Writings state selectors. */
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../index'
import type { WritingItem } from './types'

const selectWritingsSlice = (state: RootState) => state.writings

/** All writing items as an array. */
export const selectAllWritings = (state: RootState): WritingItem[] => state.writings.items

/** The currently selected writing item, or undefined if none. */
export const selectSelectedWriting = createSelector(
  selectWritingsSlice,
  (writings) => writings.items.find((w) => w.id === writings.selectedId)
)

/** The id of the currently selected writing. */
export const selectSelectedWritingId = (state: RootState): string | null =>
  state.writings.selectedId

/** Writings loading status. */
export const selectWritingsStatus = (state: RootState) => state.writings.status

/** Writings error message. */
export const selectWritingsError = (state: RootState) => state.writings.error

/** A single writing item by id, or undefined. */
export const selectWritingById = (state: RootState, id: string): WritingItem | undefined =>
  state.writings.items.find((w) => w.id === id)
