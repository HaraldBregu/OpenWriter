# Block Gutter — `BlockControls` and `BlockActions`

Historical know-how for two TipTap gutter affordances that were removed from the
editor on 2026-04-25. Use this document if/when we want to reintroduce them.

The components produced a Notion-style "gutter" around every top-level block:

- **`BlockControls`** — a drag handle (`GripVertical`) on the **left** gutter
  that let the user drag a block up or down, with a live drop-indicator line.
- **`BlockActions`** — a `MoreVertical` menu on the **right** gutter exposing
  Copy / Cut / Duplicate / Delete for the hovered block.

Both components followed the same display contract: they only became visible
while the user was hovering a top-level block, and they positioned themselves
absolutely against the block's vertical position.

---

## Architecture

```
        ┌───────────────────────────────────────────────────────┐
        │ Layout.tsx                                            │
        │   <div ref={containerRef} padding=GUTTER_WIDTH>       │
        │     <Provider editor containerRef>                    │
        │        useBlockHover  →  dispatch SET_HOVERED_BLOCK   │
        │        state.hoveredBlock   ── consumed by ──┐        │
        │        BlockControls / BlockActions          │        │
        │     </Provider>                                       │
        │   </div>                                              │
        └───────────────────────────────────────────────────────┘
```

The pieces that worked together:

| Piece                              | Role                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `Layout.tsx`                       | Provided the `containerRef` and reserved `GUTTER_WIDTH` of horizontal padding for the affordances to live in. |
| `useBlockHover` (`hooks/use-block-hover.ts`) | Listened to `mousemove` / `mouseleave` on the container, resolved the top-level ProseMirror block under the cursor, and dispatched `SET_HOVERED_BLOCK`. |
| `context/state.ts: HoveredBlock`   | `{ node: HTMLElement; pos: number; top: number }` — DOM node, document position, and top offset relative to the container. |
| `context/actions.ts: SET_HOVERED_BLOCK` | Reducer action used to update `state.hoveredBlock`.                  |
| `Provider.tsx`                     | Wired `useBlockHover` to the reducer and exposed `setHoveredBlock`.       |
| `BlockControls.tsx`                | Rendered the drag handle and implemented drag-to-reorder via PM transactions. |
| `BlockActions.tsx`                 | Rendered the dropdown of block actions and implemented copy/cut/duplicate/delete via TipTap commands. |
| `i18n: blockActions.title`         | Aria-label for the `MoreVertical` trigger ("Block actions").              |
| `shared/common.ts: GUTTER_WIDTH`   | The horizontal gutter reserved by `Layout`. **Still in use** for layout padding even after the removal. |

---

## What `useBlockHover` did

`useBlockHover({ editor, containerRef, dispatch })` attached two listeners to
`containerRef.current`:

- **`mousemove`** — for each top-level child of `.ProseMirror`, checked whether
  `clientY` fell within its bounding rect (with a 4px tolerance). When it did,
  it resolved the corresponding document position via
  `editor.view.posAtDOM(child, 0)` then `doc.resolve(p).before(1)` to get the
  block start position, and dispatched:

  ```ts
  dispatch({
    type: 'SET_HOVERED_BLOCK',
    payload: {
      node: child,
      pos,
      top: blockRect.top - containerRect.top + Math.min(lineHeight, blockRect.height) / 2 - 12,
    },
  });
  ```

  The `top` value was vertically centered on the first line of text so the
  affordance lined up with the baseline of paragraphs and headings alike.

- **`mouseleave`** — cleared the hovered block after an 80 ms delay so the user
  could move horizontally into the gutter affordance without it disappearing
  mid-flight.

It also explicitly excluded the `contentGenerator` node (the AI prompt nodeview)
to avoid placing affordances next to it.

---

## What `BlockControls` did

Pinned to the left of the block (`-left-2`, `z-50`) using
`top: hoveredBlock.top - 4`. It cached the last-known `top` in a ref so the
handle stayed visible at the right place during a drag (when `hoveredBlock`
churns).

The drag implementation was hand-rolled, **not** HTML5 drag-and-drop:

1. `onMouseDown` recorded the source block (DOM + `pos`) and added the
   `is-dragging` class.
2. `mousemove` resolved the block under the cursor (same algorithm as
   `useBlockHover`), determined drop direction (`above` / `below` based on the
   midline), and updated a drop-indicator line absolutely positioned via
   `top: dropState.top, left: GUTTER_WIDTH, right: 0`.
3. `mouseup` performed the move via a single ProseMirror transaction:

   ```ts
   const insertPos = dropDir === 'above' ? target.pos : target.pos + tn.nodeSize;
   if (srcPos < insertPos) {
     tr.insert(insertPos, sn.copy(sn.content));
     tr.delete(srcPos, srcEnd);
   } else {
     tr.delete(srcPos, srcEnd);
     tr.insert(insertPos, sn.copy(sn.content));
   }
   editor.view.dispatch(tr);
   ```

   The order of `insert` then `delete` (or vice versa) matters because deleting
   first shifts subsequent positions.

---

## What `BlockActions` did

Pinned to the right of the block (`-right-2`, `z-50`). It used the same
`top` strategy as `BlockControls`, but added a **menu-open lock**: when the
dropdown opened it captured the current `hoveredBlock` into a ref so that
moving the cursor away (and clearing `state.hoveredBlock`) did not change which
block the menu acted on or shift the dropdown's vertical position.

Visibility = `!!hoveredBlock || menuOpen`.

Actions were implemented with TipTap chains over `nodeAt(block.pos)`:

- **Copy**: `navigator.clipboard.writeText(node.textContent)`
- **Cut**: copy then `editor.chain().focus().deleteRange({ from, to }).run()`
- **Duplicate**: `editor.chain().focus().insertContentAt(block.pos + node.nodeSize, node.toJSON()).run()`
- **Delete**: same `deleteRange` as cut, no clipboard write.

---

## How to reimplement

If you bring these back, the minimum required pieces are:

1. **State and dispatch**
   - Re-add `HoveredBlock` to `context/state.ts` and the `hoveredBlock: HoveredBlock | null` field on `EditorState`.
   - Re-add `SET_HOVERED_BLOCK` to `context/actions.ts` and a corresponding case in `context/reducer.ts`.
   - Re-add `setHoveredBlock` on the context value in `context/context.ts` and `Provider.tsx`.

2. **Hover detection**
   - Re-create `hooks/use-block-hover.ts` with the algorithm described above.
   - Call it from `Provider.tsx` once `editor` and `containerRef` are available.
   - Remember to bail out for the `contentGenerator` node (and any future nodeview that owns its own pointer interactions).

3. **Components**
   - Add `BlockControls` and `BlockActions` to `editor/components/`.
   - Mount them inside `Editor.tsx`'s `Content()` alongside `BubbleMenu` and `OptionMenu`. They must render inside `Layout`'s container (which provides `containerRef` and the `GUTTER_WIDTH` padding).
   - Both components consume `useEditor()` and read `state.hoveredBlock`.

4. **Styling contract**
   - `Layout` already pads its inner container by `GUTTER_WIDTH` on both sides — the affordances live in that gutter via `-left-2` / `-right-2`.
   - Use opacity transitions (`opacity-0 → opacity-100`, `pointer-events-none → pointer-events-auto`) to fade the affordances in. Toggling `display` causes flicker.
   - Cache the last-known `top` in a ref so the affordance stays pinned during transient `hoveredBlock` churn (e.g. while dragging or while a menu is open).

5. **Translations**
   - Restore the `blockActions.title` key in `resources/i18n/en/main.json` and `resources/i18n/it/main.json` (English: "Block actions", Italian: "Azioni blocco").

6. **Drag visuals**
   - The drop indicator was a `2.5px` rounded primary-color line, `left: GUTTER_WIDTH, right: 0`, toggled by `dropState.visible`.
   - During drag, the source block got an `is-dragging` class. There was no global CSS for it — add one if you want a visual style (e.g. reduced opacity).

---

## Why it was removed

The affordances were already disabled (commented out in `Editor.tsx`) and the
removal cleaned up the supporting state machinery so the editor surface stays
small. Bring them back as a self-contained reintroduction when there's renewed
demand for in-gutter block manipulation.
