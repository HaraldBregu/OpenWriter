import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ReactNode, useEffect, useRef } from "react";
import { useArray } from "@/hooks/use-array";

// TODO: Refactor this component

interface SortableProps<T> {
  itemLs: T[],
  item: (value: T, index: number, drag: (children) => ReactNode) => ReactNode,
  wrapper: (els: React.ReactNode[]) => ReactNode,
  readSorted?: ((els: T[]) => void) | React.Dispatch<React.SetStateAction<T[]>>
  readonly?: boolean
  iconClassName?: string
  includedElements?: SetupDialogStateType
}

type SortableItemProps = {
  value: string,
  children: (drag: (children) => ReactNode) => ReactNode,
  readonly?: boolean
  iconClassName?: string
  visibility?: string
}

export const SortableItem = ({ visibility, value, iconClassName, children, readonly = false }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: value,
    disabled: readonly
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    display: `${visibility || 'flex'}`,
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ flex: 1 }}>{children(c => <div className={`c-sortable-element ${iconClassName}`} {...attributes} {...listeners}>{c}</div>)}</div>
    </div>
  );
};

export const SortableArea = <T extends string>({ includedElements, itemLs, readSorted, item, wrapper, readonly = false, iconClassName }: SortableProps<T>) => {

  const sensors = useSensors(useSensor(PointerSensor));
  const [orderedItems, setOrderedItems] = useArray<T>([]);
  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
  }, [])

  useEffect(() => setOrderedItems.replace(itemLs), [itemLs])

  useEffect(() => {
    if (orderedItems.length > 0 && isMounted.current) {
      readSorted?.(orderedItems)
    } 
  }, [orderedItems])

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setOrderedItems.replace((() => {
        const oldIndex = orderedItems.indexOf(active.id);
        const newIndex = orderedItems.indexOf(over.id);
        return arrayMove(orderedItems, oldIndex, newIndex);
      })());
    }
  };

  const WrapperComponent = readonly ? 'div' : DndContext;

  const getVisibilityHideAccordion = (key: string): "flex" | "none" => {
    return includedElements?.[key]?.visible === false ? "none" : "flex";
  };

  return (
    <WrapperComponent
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedItems}
        strategy={verticalListSortingStrategy}
      >
        {wrapper(orderedItems.filter(Boolean).map((value, i) => (
          <SortableItem key={JSON.stringify(value)} value={value} readonly={readonly} iconClassName={iconClassName}
            visibility={getVisibilityHideAccordion(value)}>
            {d => item(value, i, d)}
          </SortableItem>
        )))}
      </SortableContext>
    </WrapperComponent>
  )
}
