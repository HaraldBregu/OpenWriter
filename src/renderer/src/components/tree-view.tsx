import React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import Dropdown from '@/components/icons/Dropdown'

const treeVariants = cva(
    'group hover:before:opacity-100 before:absolute before:rounded-lg before:left-0 px-2 before:w-full before:opacity-0 before:bg-accent/70 before:h-[2rem] before:-z-10'
)

const selectedTreeVariants = cva(
    'before:opacity-100 before:bg-accent/70 text-accent-foreground'
)

const dragOverVariants = cva(
    'before:opacity-100 before:bg-primary/20 text-primary-foreground'
)

interface TreeDataItem {
    id: string
    name: string
    customName?: string
    showHeadingNumbers?: boolean
    icon?: any
    selectedIcon?: any
    openIcon?: any
    children?: TreeDataItem[]
    actions?: React.ReactNode
    onClick?: () => void
    draggable?: boolean
    droppable?: boolean
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
    data: TreeDataItem[] | TreeDataItem
    initialSelectedItemId?: string
    onSelectChange?: (item: TreeDataItem | undefined) => void
    expandAll?: boolean
    defaultNodeIcon?: any
    defaultLeafIcon?: any
    onItemClick?: (item: TreeDataItem) => void;
    onTreeItemClicked?: (item: TreeItem) => void;
    onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void
    defaultOpen?: boolean
    indentLevels?: boolean
}

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
    (
        {
            data,
            initialSelectedItemId,
            onSelectChange,
            expandAll,
            defaultLeafIcon,
            defaultNodeIcon,
            className,
            onDocumentDrag,
            defaultOpen = false,
            onItemClick,
            indentLevels = true,
            ...props
        },
        ref
    ) => {
        const [selectedItemId, setSelectedItemId] = React.useState<
            string | undefined
        >(initialSelectedItemId)

        const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(null)

        const handleSelectChange = React.useCallback(
            (item: TreeDataItem | undefined) => {
                setSelectedItemId(item?.id)
                if (onSelectChange) {
                    onSelectChange(item)
                }
            },
            [onSelectChange]
        )

        const handleDragStart = React.useCallback((item: TreeDataItem) => {
            setDraggedItem(item)
        }, [])

        const handleDrop = React.useCallback((targetItem: TreeDataItem) => {
            if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
                onDocumentDrag(draggedItem, targetItem)
            }
            setDraggedItem(null)
        }, [draggedItem, onDocumentDrag])

        const expandedItemIds = React.useMemo(() => {
            if (!initialSelectedItemId) {
                return [] as string[]
            }

            const ids: string[] = []
            //@ts-ignore
            function walkTreeItems(
                items: TreeDataItem[] | TreeDataItem,
                targetId: string
            ): boolean {
                if (items instanceof Array) {
                    for (let i = 0; i < items.length; i++) {
                        ids.push(items[i]!.id)
                        if (walkTreeItems(items[i]!, targetId) && !expandAll) {
                            return true
                        }
                        if (!expandAll) ids.pop()
                    }
                    return false
                } else if (!expandAll && items.id === targetId) {
                    return true
                } else if (items.children) {
                    return walkTreeItems(items.children, targetId)
                }
                return false
            }

            walkTreeItems(data, initialSelectedItemId)
            return ids
        }, [data, expandAll, initialSelectedItemId])

        return (
            <div className={cn('overflow-hidden relative', className)}>
                <TreeItem
                    data={data}
                    ref={ref}
                    selectedItemId={selectedItemId}
                    handleSelectChange={handleSelectChange}
                    expandedItemIds={expandedItemIds}
                    defaultLeafIcon={defaultLeafIcon}
                    defaultNodeIcon={defaultNodeIcon}
                    handleDragStart={handleDragStart}
                    handleDrop={handleDrop}
                    draggedItem={draggedItem}
                    defaultOpen={defaultOpen}
                    onItemClick={onItemClick}
                    indentLevels={indentLevels}
                    {...props}
                />
                {/* <div
                    className='w-full h-[48px]'
                    onDrop={(e) => { handleDrop({ id: '', name: 'parent_div' }) }}>
                </div> */}
            </div>
        )
    }
)
TreeView.displayName = 'TreeView'

type TreeItemProps = TreeProps & {
    selectedItemId?: string
    handleSelectChange: (item: TreeDataItem | undefined) => void
    expandedItemIds: string[]
    defaultNodeIcon?: any
    defaultLeafIcon?: any
    handleDragStart?: (item: TreeDataItem) => void
    handleDrop?: (item: TreeDataItem) => void
    draggedItem: TreeDataItem | null
    defaultOpen?: boolean
    onItemClick?: (item: TreeDataItem) => void
    onTreeItemClicked?: (item: TreeItem) => void
    indentLevels?: boolean
}

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
    (
        {
            className,
            data,
            selectedItemId,
            handleSelectChange,
            expandedItemIds,
            defaultNodeIcon,
            defaultLeafIcon,
            handleDragStart,
            handleDrop,
            draggedItem,
            defaultOpen,
            onItemClick,
            onTreeItemClicked,
            indentLevels,
            ...props
        },
        ref
    ) => {
        if (!(data instanceof Array)) {
            data = [data]
        }
        return (
            <div ref={ref} role="tree" className={className} {...props}>
                <ul>
                    {data.map((item) => (
                        <li key={item.id}>
                            {item.children ? (
                                <TreeNode
                                    item={item}
                                    selectedItemId={selectedItemId}
                                    expandedItemIds={expandedItemIds}
                                    handleSelectChange={handleSelectChange}
                                    defaultNodeIcon={defaultNodeIcon}
                                    defaultLeafIcon={defaultLeafIcon}
                                    handleDragStart={handleDragStart}
                                    handleDrop={handleDrop}
                                    draggedItem={draggedItem}
                                    defaultOpen={defaultOpen}
                                    onItemClick={(item) => {
                                        onItemClick?.(item);
                                        onTreeItemClicked?.(item as TreeItem)
                                    }}
                                    indentLevels={indentLevels}
                                />
                            ) : (
                                <TreeLeaf
                                    item={item}
                                    selectedItemId={selectedItemId}
                                    handleSelectChange={handleSelectChange}
                                    defaultLeafIcon={defaultLeafIcon}
                                    handleDragStart={handleDragStart}
                                    handleDrop={handleDrop}
                                    draggedItem={draggedItem}
                                    onItemClick={onItemClick}
                                    indentLevels={indentLevels}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        )
    }
)
TreeItem.displayName = 'TreeItem'

const TreeNode = ({
    item,
    handleSelectChange,
    expandedItemIds,
    selectedItemId,
    defaultNodeIcon,
    defaultLeafIcon,
    handleDragStart,
    handleDrop,
    draggedItem,
    defaultOpen,
    onItemClick,
    indentLevels,
}: {
    item: TreeDataItem
    handleSelectChange: (item: TreeDataItem | undefined) => void
    expandedItemIds: string[]
    selectedItemId?: string
    defaultNodeIcon?: any
    defaultLeafIcon?: any
    handleDragStart?: (item: TreeDataItem) => void
    handleDrop?: (item: TreeDataItem) => void
    draggedItem: TreeDataItem | null
    defaultOpen?: boolean
    onItemClick?: (item: TreeDataItem) => void
    indentLevels?: boolean
}) => {
    const [value, setValue] = React.useState(
        defaultOpen || expandedItemIds.includes(item.id) ? [item.id] : []
    )
    const [isDragOver, setIsDragOver] = React.useState(false)

    const onDragStart = (e: React.DragEvent) => {
        if (!item.draggable) {
            e.preventDefault()
            return
        }
        e.dataTransfer.setData('text/plain', item.id)
        handleDragStart?.(item)
    }

    const onDragOver = (e: React.DragEvent) => {
        if (item.droppable !== false && draggedItem && draggedItem.id !== item.id) {
            e.preventDefault()
            setIsDragOver(true)
        }
    }

    const onDragLeave = () => {
        setIsDragOver(false)
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        handleDrop?.(item)
    }

    if (item.children && item.children.length === 0) {
        return (
            <div>
                <TreeLeaf item={item} selectedItemId={selectedItemId} handleSelectChange={handleSelectChange} defaultLeafIcon={defaultLeafIcon} handleDragStart={handleDragStart} handleDrop={handleDrop} draggedItem={draggedItem} onItemClick={onItemClick} indentLevels={indentLevels} />
            </div>
        )
    }

    return (
        <AccordionPrimitive.Root
            type="multiple"
            value={value}
            onValueChange={(s) => setValue(s)}
            defaultValue={defaultOpen ? [item.id] : undefined}
        >
            <AccordionPrimitive.Item value={item.id}>
                <AccordionTrigger
                    className={cn(
                        treeVariants(),
                        selectedItemId === item.id && selectedTreeVariants(),
                        isDragOver && dragOverVariants()
                    )}
                    onClick={() => {
                        handleSelectChange(item)
                        item.onClick?.()
                    }}
                    draggable={!!item.draggable}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                >
                    <TreeIcon
                        item={item}
                        isSelected={selectedItemId === item.id}
                        isOpen={defaultOpen || value.includes(item.id)}
                        default={defaultNodeIcon}
                    />
                    <span
                        className="text-sm font-medium truncate max-w-[200px]"
                        onClick={() => onItemClick?.(item)}
                    >{item.showHeadingNumbers ? item.customName : item.name}</span>
                    <TreeActions isSelected={selectedItemId === item.id}>
                        {item.actions}
                    </TreeActions>
                </AccordionTrigger>
                <AccordionContent className={cn(indentLevels ? "ml-2" : "ml-0")}>
                    <TreeItem
                        data={item.children ? item.children : item}
                        selectedItemId={selectedItemId}
                        handleSelectChange={handleSelectChange}
                        expandedItemIds={expandedItemIds}
                        defaultLeafIcon={defaultLeafIcon}
                        defaultNodeIcon={defaultNodeIcon}
                        handleDragStart={handleDragStart}
                        handleDrop={handleDrop}
                        draggedItem={draggedItem}
                        defaultOpen={defaultOpen}
                        onItemClick={onItemClick}
                        indentLevels={indentLevels}
                    />
                </AccordionContent>
            </AccordionPrimitive.Item>
        </AccordionPrimitive.Root>
    )
}

const TreeLeaf = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        item: TreeDataItem
        selectedItemId?: string
        handleSelectChange: (item: TreeDataItem | undefined) => void
        defaultLeafIcon?: any
        handleDragStart?: (item: TreeDataItem) => void
        handleDrop?: (item: TreeDataItem) => void
        draggedItem: TreeDataItem | null
        onItemClick?: (item: TreeDataItem) => void
        indentLevels?: boolean
    }
>(
    (
        {
            className,
            item,
            selectedItemId,
            handleSelectChange,
            defaultLeafIcon,
            handleDragStart,
            handleDrop,
            draggedItem,
            onItemClick,
            indentLevels,
            ...props
        },
        ref
    ) => {
        const [isDragOver, setIsDragOver] = React.useState(false)

        const onDragStart = (e: React.DragEvent) => {
            if (!item.draggable) {
                e.preventDefault()
                return
            }
            e.dataTransfer.setData('text/plain', item.id)
            handleDragStart?.(item)
        }

        const onDragOver = (e: React.DragEvent) => {
            if (item.droppable !== false && draggedItem && draggedItem.id !== item.id) {
                e.preventDefault()
                setIsDragOver(true)
            }
        }

        const onDragLeave = () => {
            setIsDragOver(false)
        }

        const onDrop = (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragOver(false)
            handleDrop?.(item)
        }

        return (
            <div
                ref={ref}
                className={cn(
                    indentLevels ? 'ml-2' : 'ml-1',
                    'flex text-left items-center py-2 cursor-pointer before:Dropdown-1',
                    treeVariants(),
                    className,
                    selectedItemId === item.id && selectedTreeVariants(),
                    isDragOver && dragOverVariants()
                )}
                onClick={() => {
                    handleSelectChange(item)
                    item.onClick?.()
                }}
                draggable={!!item.draggable}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                {...props}
            >
                <TreeIcon
                    item={item}
                    isSelected={selectedItemId === item.id}
                    default={defaultLeafIcon}
                />
                <span
                    className="flex-grow text-sm truncate max-w-[200px]"
                    onClick={() => onItemClick?.(item)}
                >{item.showHeadingNumbers ? item.customName : item.name}</span>
                <TreeActions isSelected={selectedItemId === item.id}>
                    {item.actions}
                </TreeActions>
            </div>
        )
    }
)
TreeLeaf.displayName = 'TreeLeaf'

const AccordionTrigger = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger
            ref={ref}
            className={cn(
                'flex flex-1 w-full items-center py-2 transition-all first:[&[data-state=open]>svg]:rotate-180',
                className
            )}
            {...props}
        >
            <Dropdown className="transition-transform duration-200" variant="icon" intent="secondary" size={20} />
            {children}
        </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<
    React.ElementRef<typeof AccordionPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content
        ref={ref}
        className={cn(
            'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-Dropdown',
            className
        )}
        {...props}
    >
        <div className="pb-1 pt-0">{children}</div>
    </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

const TreeIcon = ({
    item,
    isOpen,
    isSelected,
    default: defaultIcon
}: {
    item: TreeDataItem
    isOpen?: boolean
    isSelected?: boolean
    default?: any
}) => {
    let Icon = defaultIcon
    if (isSelected && item.selectedIcon) {
        Icon = item.selectedIcon
    } else if (isOpen && item.openIcon) {
        Icon = item.openIcon
    } else if (item.icon) {
        Icon = item.icon
    }
    return Icon ? (
        <Icon className="h-4 w-4 shrink-0 mr-2" />
    ) : (
        <></>
    )
}

const TreeActions = ({
    children,
    isSelected
}: {
    children: React.ReactNode
    isSelected: boolean
}) => {
    return (
        <div
            className={cn(
                isSelected ? 'block' : 'hidden',
                'absolute Dropdown-3 group-hover:block'
            )}
        >
            {children}
        </div>
    )
}

export { TreeView, type TreeDataItem }
