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


function SortableFontItem({ id, item, onDelete, onDuplicate, selected, onFontSelect }) {
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
      onClick={onFontSelect}
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
            textAlign: item.align,
            lineHeight: item.lineHeight,
            display: 'inline-block',
            maxWidth: '200px',
          }}
        >
          {item.name}
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="icon"
          size="iconMini"
          intent="secondary"
          icon={<Copy size={20} color={selected && 'white'} />}
          onClick={onDuplicate}
        />
        <Button
          variant="icon"
          size="iconMini"
          intent="secondary"
          icon={<Delete size={20} color={selected && 'white'} />}
          onClick={onDelete}
        />
      </div>
    </div>
  );
}


function SortableFontList({ fonts, onFontsChange, selectedFont, onFontSelect }) {
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

        const oldIndex = fonts.findIndex(i => i.id === active.id);
        const newIndex = fonts.findIndex(i => i.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newItems = arrayMove(fonts, oldIndex, newIndex);
          onFontsChange(newItems);

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
      <SortableContext items={fonts.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={scrollRef}
          className="max-h-[400px] overflow-y-auto pb-10"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {fonts.map(item => (
            <SortableFontItem
              key={item.id}
              id={item.id}
              item={item}
              onFontSelect={() => onFontSelect(item)}
              selected={selectedFont?.id === item.id}
              onDelete={() => onFontsChange(prev => prev.filter(i => i.id !== item.id))}
              onDuplicate={() => {
                onFontsChange(prev => {
                  // @todo: handle duplicate font logic
                  console.log('Duplicate font:', item);
                  const clone = { ...item, id: `${item.id}-copy` };
                  const index = prev.findIndex(i => i.id === item.id);
                  const newList = [...prev];
                  newList.splice(index + 1, 0, clone);
                  return newList;
                });
              }} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export default SortableFontList;
