import { clsx } from 'clsx';
import { useRef } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";
import { DndContext, KeyboardSensor, PointerSensor, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Copy from "@/components/icons/Copy";
import Button from "@/components/ui/button";
import DragHandle from "@/components/icons/DragHandle";
import Delete from "@/components/icons/Delete";


/**
 * This function emulates the Windows-style "Copy" naming behavior.
 *
 * Given a base name (e.g., "Document") and a list of existing names,
 * it generates the next available name in the format:
 *
 * - "Document"                    → original
 * - "Document - Copy"             → first duplicate
 * - "Document - Copy (2)"         → second duplicate
 * - "Document - Copy (3)"         → third duplicate
 * - ...and so on
 *
 * Algorithm:
 * 1. Match all names that follow one of these patterns:
 *    - "Document"
 *    - "Document - Copy"
 *    - "Document - Copy (n)"
 * 2. Extract the numeric suffix if present.
 *    - "Document"     → treated as 0 (original)
 *    - "Document - Copy" → treated as 1
 *    - "Document - Copy (2)" → treated as 2
 * 3. Sort the suffixes and find the smallest missing integer ≥ 1.
 * 4. Return the corresponding name:
 *    - If 1 is missing → return "Document - Copy"
 *    - If 2 is missing → return "Document - Copy (2)"
 *    - and so on...
 *
 * This ensures no duplicates and that numbering is compact,
 * just like Windows Explorer does when duplicating files.
 */


function getNextName(baseName: string, existingNames: string[]): string {
  const basePattern = new RegExp(`^${baseName}( - Copy)?( \\((\\d+)\\))?$`);
  const suffixes = existingNames
    .map(name => {
      const match = name.match(basePattern);
      if (match) {
        if (!match[1]) return 0; // original base name
        if (!match[3]) return 1; // " - Copy"
        return parseInt(match[3], 10); // " - Copy (n)"
      }
      return null;
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  if (!suffixes.includes(1)) {
    return `${baseName} - Copy`;
  }

  for (let i = 2; i <= suffixes.length + 1; i++) {
    if (!suffixes.includes(i)) {
      return `${baseName} - Copy (${i})`;
    }
  }

  return `${baseName} - Copy (${suffixes.length + 1})`;
}

function SortableStyleItem({ id, item, onDelete, onDuplicate, selected, onStyleSelect }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onClick={onStyleSelect}
      style={style}
      className={clsx(
        'flex items-center justify-between px-3 py-2 select-none rounded',
        isDragging && 'opacity-50',
        selected && 'bg-[#0625ac] text-white',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="cursor-grab" {...listeners}>
          <DragHandle size={20} color={selected && 'white'} />
        </span>
        <span
          className="truncate"
          style={{
            fontFamily: item.fontFamily,
            fontSize: item.fontSize,
            fontWeight: item.fontWeight,
            color: selected ? 'white' : item.color,
            display: 'inline-block',
            maxWidth: '200px',
          }}
        >
          {item.name}
        </span>
      </div>
      <div className="flex gap-2">
        {item.name.split(".").length < 3 && (
          <Button
            variant="icon"
            size="iconMini"
            intent="secondary"
            icon={<Copy size={20} color={selected && 'white'} />}
            onClick={onDuplicate}
          />
        )}
        {item.type === "CUSTOM" && <Button
          variant="icon"
          size="iconMini"
          intent="secondary"
          icon={<Delete size={20} color={selected && 'white'} />}
          onClick={onDelete}
        />}
      </div>
    </div>
  );
}


function SortableStylesList({ styles, onStylesChange, selectedStyle, onStyleSelect }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 50,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext
      collisionDetection={pointerWithin}
      sensors={sensors}
      modifiers={[restrictToFirstScrollableAncestor]}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;

        const oldIndex = styles.findIndex(i => i.id === active.id);
        const newIndex = styles.findIndex(i => i.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newItems = arrayMove(styles, oldIndex, newIndex);
          onStylesChange(newItems);

          if (newIndex === newItems.length - 1) {
            setTimeout(() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({
                  top: scrollRef.current.scrollHeight,
                  behavior: 'smooth',
                });
              }
            }, 0);
          }
        }
      }}
    >
      <SortableContext items={styles.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={scrollRef}
          className="max-h-[400px] overflow-y-auto pb-10"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {styles.map(item => (
            <SortableStyleItem
              key={item.id}
              id={item.id}
              item={item}
              onStyleSelect={() => onStyleSelect(item)}
              selected={selectedStyle?.id === item.id}
              onDelete={() => onStylesChange(prev => prev.filter(i => i.id !== item.id))}
              onDuplicate={() => {
                const existingNames = styles.map(i => i.name);
                const newName = getNextName(item.name, existingNames);

                const clone = {
                  ...item,
                  id: `${item.id}-copy-${Date.now()}`,
                  name: newName,
                  type: "CUSTOM"
                };

                const index = styles.findIndex(i => i.id === item.id);
                const newList = [...styles];
                newList.splice(index + 1, 0, clone);

                onStylesChange(newList);

                setTimeout(() => {
                  onStyleSelect(clone);
                }, 0);
              }}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default SortableStylesList;
