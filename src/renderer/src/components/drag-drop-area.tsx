import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ReactNode, useEffect, useState } from "react";

interface SortableProps {
  itemLs: string[],
  item: (value: string) => ReactNode,
  wrapper: (els: React.ReactNode[]) => ReactNode,
  readSorted?: React.Dispatch<React.SetStateAction<string[]>>
}

const SortableItem = ({ value, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: value });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

export const SortableArea =  ({itemLs, readSorted, item, wrapper}: SortableProps) => {
  const sensors = useSensors(useSensor(PointerSensor));
  const [orderedItems, setOrderedItems] = useState(itemLs);

  useEffect(() => {
    readSorted?.(orderedItems)
  }, [orderedItems])

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setOrderedItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedItems}
        strategy={verticalListSortingStrategy}
      >
          {wrapper(orderedItems.map((value) => (
            <SortableItem key={value} value={value}>
              {item(value)}
            </SortableItem>
          )))}
      </SortableContext>
    </DndContext>
  )
}