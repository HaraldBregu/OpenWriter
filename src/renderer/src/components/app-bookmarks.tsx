import { ForwardedRef, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Button from "./ui/button";
import PlusSimple from "@/components/icons/PlusSimple";
import { Input } from "./ui/input";
import useSingleAndDoubleClick from "@/hooks/use-single-double-click";
import Bookmark from "./icons/Bookmark";
import { formatDateWithTime } from "@/utils/date";
import { Textarea } from "./ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem } from "./ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next";
import Dropdown from "./icons/Dropdown";
import More from "./icons/More";

interface BookmarksProps {
    title: string;
    categories: BookmarkCategory[];
    items: Bookmark[];
    selectedBookmark: Bookmark | null;
    onCreateCategory: () => void;
    onUpdateCategory: (category: BookmarkCategory) => void;
    onDeleteCategory: (category: BookmarkCategory, bookmarks: Bookmark[], categories: BookmarkCategory[]) => void;
    onEditBookmark: (bookmark: Bookmark) => void;
    onDeleteBookmark: (bookmark: Bookmark) => void;
    onClickBookmark: (bookmark: Bookmark) => void;
    onMoveBookmarkToCategory: (bookmark: Bookmark, category: BookmarkCategory | null) => void;
}

const AppBookmarks = forwardRef(({
    title,
    categories,
    items,
    selectedBookmark,
    onCreateCategory,
    onUpdateCategory,
    onDeleteCategory,
    onEditBookmark,
    onDeleteBookmark,
    onClickBookmark,
    onMoveBookmarkToCategory
}: BookmarksProps, ref: ForwardedRef<unknown>) => {
    useImperativeHandle(ref, () => {
        return {
            createBookmark: (id: string, categoryId?: string) => {
                const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                (async () => {
                    await delay(100);
                    setEditingBookmarkId(id);

                    await delay(100);
                    if (categoryId) {
                        setExpandedCategoryIds(prev => {
                            if (prev.includes(categoryId)) return prev;
                            return [...prev, categoryId];
                        });
                    }
                    await delay(100);
                    const element = itemRefs.current[id ?? ""];
                    element?.scrollIntoView({ behavior: "smooth", block: "center" });
                })();
            }
        }
    })

    const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
    const [isEditingCategoryAtIndex, setIsEditingCategoryAtIndex] = useState<number | null>(null);
    const [categoryName, setCategoryName] = useState<string>("")
    const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number | null>(null)
    const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null)
    const [error, setError] = useState(false)

    const toggleSection = (category: BookmarkCategory, index: number) => {
        if (isEditingCategoryAtIndex === index) return
        setExpandedCategoryIds(prev => {
            if (prev.includes(category.id)) {
                return prev.filter(id => id !== category.id)
            }
            return [...prev, category.id]
        })

    };

    const { t } = useTranslation();

    const handleCategoryClick = useSingleAndDoubleClick(
        () => {
            setCurrentCategoryIndex(null)
            setIsEditingCategoryAtIndex(null)
        },
        () => {
            if (currentCategoryIndex === null) return;
            setCurrentCategoryIndex(currentCategoryIndex)
            setCategoryName(categories[currentCategoryIndex].name)
            setIsEditingCategoryAtIndex(currentCategoryIndex)
        },
        450
    );

    const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});

    useEffect(() => {
        const categoryId = selectedBookmark?.categoryId
        if (categoryId) {
            setExpandedCategoryIds(prev => {
                if (prev.includes(categoryId))
                    return prev

                return [...prev, categoryId]
            })
        }

        setTimeout(() => {
            const element = itemRefs.current[selectedBookmark?.id ?? ""];
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);

    }, [selectedBookmark])

    const handleMoveToCategory = (bookmark: Bookmark, category: BookmarkCategory | null) => {
        onMoveBookmarkToCategory(bookmark, category)

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        (async () => {
            await delay(100);
            setExpandedCategoryIds(prev => {
                if (prev.includes(category?.id ?? ""))
                    return prev

                return [...prev, category?.id ?? ""]
            })
            await delay(300);
            const element = itemRefs.current[bookmark.id];
            window.scrollTo({
                top: element?.offsetTop,
                behavior: "smooth"
            })
        })();
    }

    return (
        <AppBookmarksContainer>
            <AppBookmarksHeaderContainer>
                <h4 className="text-xs font-medium">{title}</h4>
                <Button
                    intent="secondary"
                    variant="icon"
                    size="iconSm"
                    icon={<PlusSimple intent='primary' variant='tonal' size='small' />}
                    onClick={onCreateCategory}
                />
            </AppBookmarksHeaderContainer>
            <AppBookmarksBodyContainer>

                {/* Not categorized items */}
                {items.filter(data => !data.categoryId).map((item) => {
                    if (item.id === editingBookmarkId) {
                        return (
                            <BookmarkEditItem
                                key={item.id}
                                item={item}
                                onDone={(title, description) => {
                                    setEditingBookmarkId(null)
                                    onEditBookmark({ ...item, title, description })
                                }}
                            />
                        )
                    } else {
                        return (
                            <BookmarkItem
                                key={item.id}
                                ref={el => itemRefs.current[item.id] = el}
                                item={item}
                                selected={selectedBookmark?.id === item.id}
                                categories={categories}
                                onClickContent={() => {
                                    onClickBookmark(item)
                                }}
                                onEdit={() => setEditingBookmarkId(item.id)}
                                onDelete={() => onDeleteBookmark(item)}
                                onMoveToCategory={(category) => handleMoveToCategory(item, category)}
                            />
                        );
                    }
                })}

                {/* Categorized items */}
                {categories.map((category, index) => (
                    <AppBookmarksCategoryContainer key={index}>
                        <AppBookmarksCategoryHeaderContainer onClick={() => toggleSection(category, index)}>
                            {isEditingCategoryAtIndex === index && (
                                <Input
                                    autoFocus
                                    className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    maxLength={255}
                                    value={categoryName}
                                    onChange={(e) => {
                                        setError((e.target.value.length < 1) ? true : false)
                                        setCategoryName(e.target.value)
                                    }}
                                    onBlur={() => {
                                        if (categoryName.length >= 1) {
                                            onUpdateCategory({ ...category, name: categoryName })
                                            setIsEditingCategoryAtIndex(null)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key == "Escape") {
                                            e.preventDefault()
                                            setIsEditingCategoryAtIndex(null)
                                        }
                                        else if (e.key === "Enter") {
                                            if (categoryName.length >= 1) {
                                                setError(false)
                                                onUpdateCategory({ ...category, name: categoryName })
                                                setIsEditingCategoryAtIndex(null)
                                            } else {
                                                setError(true)
                                            }
                                        }
                                    }}
                                />
                            )}
                            {isEditingCategoryAtIndex !== index && (
                                <>
                                    <div className="flex items-center gap-0 flex-1 min-w-0" onClick={() => {
                                        setCurrentCategoryIndex(index)
                                        handleCategoryClick()
                                    }}>
                                        <Button
                                            size="icon"
                                            variant="icon"
                                            className="h-6 w-6"
                                        >
                                            <Dropdown
                                                className={
                                                    `h-4 w-4 transition-transform ${expandedCategoryIds.includes(category.id) ? 'rotate-180' : ''}`
                                                }
                                            />
                                        </Button>
                                        <h5
                                            className="text-sm font-bold cursor-pointer text-nowrap overflow-hidden truncate text-ellipsis"
                                        >
                                            {category.name}
                                        </h5>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="icon"
                                                className="h-6 w-6 flex-shrink-0"
                                                onClick={(e) => e.stopPropagation()}>
                                                <More className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-30">
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation()
                                                setIsEditingCategoryAtIndex(index)
                                                setCategoryName(categories[index].name)
                                            }}>
                                                {t('bookmarks.edit')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation()
                                                onDeleteCategory(category, items.filter(data => data.categoryId === category.id), categories)
                                            }} className="text-red-600">
                                                {t('bookmarks.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </AppBookmarksCategoryHeaderContainer>
                        {expandedCategoryIds.includes(category.id) && items.filter(data => data.categoryId === category.id).map(item => {
                            if (item.id === editingBookmarkId) {
                                return (
                                    <BookmarkEditItem
                                        key={item.id}
                                        item={item}
                                        onDone={(title, description) => {
                                            setEditingBookmarkId(null)
                                            onEditBookmark({ ...item, title, description })
                                        }}
                                    />
                                )
                            } else {
                                return (
                                    <BookmarkItem
                                        key={item.id}
                                        ref={el => itemRefs.current[item.id] = el}
                                        item={item}
                                        selected={selectedBookmark?.id === item.id}
                                        categories={categories}
                                        onClickContent={() => {
                                            onClickBookmark(item)
                                        }}
                                        onEdit={() => setEditingBookmarkId(item.id)}
                                        onDelete={() => onDeleteBookmark(item)}
                                        onMoveToCategory={(category) => handleMoveToCategory(item, category)}
                                    />
                                );
                            }
                        }
                        )}
                    </AppBookmarksCategoryContainer>
                ))}
            </AppBookmarksBodyContainer>
        </AppBookmarksContainer>
    )
})

export default AppBookmarks;

// AppBookmarksContainer
interface AppBookmarksContainerProps {
    children: React.ReactNode;
}
const AppBookmarksContainer = forwardRef(({
    children,
    ...props
}: AppBookmarksContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <div className="flex flex-col h-full" {...props} ref={ref}>
            {children}
        </div>
    )
})

// AppBookmarksHeaderContainer
interface AppBookmarksHeaderContainerProps {
    children: React.ReactNode;
}
const AppBookmarksHeaderContainer = forwardRef(({
    children,
    ...props
}: AppBookmarksHeaderContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <>
            <div className="flex justify-between items-center p-2 sticky top-0 z-10" {...props} ref={ref}>
                {children}
            </div>
        </>
    )
})

// AppBookmarksBodyContainer
interface AppBookmarksBodyContainerProps {
    children: React.ReactNode;
}
const AppBookmarksBodyContainer = forwardRef(({
    children,
    ...props
}: AppBookmarksBodyContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <>
            <div className="flex-1 overflow-y-auto pt-2" {...props} ref={ref}>
                {children}
            </div>
        </>
    )
})

// AppBookmarksCategoryContainer
interface AppBookmarksCategoryContainerProps {
    children: React.ReactNode;
}
const AppBookmarksCategoryContainer = forwardRef(({
    children,
    ...props
}: AppBookmarksCategoryContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <>
            <div className="mb-4" {...props} ref={ref}>
                {children}
            </div>
        </>
    )
})

// AppBookmarksCategoryHeaderContainer
interface AppBookmarksCategoryHeaderContainerProps {
    onClick: () => void;
    children: React.ReactNode;
}
const AppBookmarksCategoryHeaderContainer = forwardRef(({
    onClick,
    children,
    ...props
}: AppBookmarksCategoryHeaderContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <>
            <div
                className="flex justify-between items-center px-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={onClick}
                {...props}
                ref={ref}
            >
                {children}
            </div>
        </>
    )
})

// BookmarkContentItem
interface BookmarkContentItemProps {
    value: string;
}
const BookmarkContentItem = forwardRef(({
    value,
    ...props
}: BookmarkContentItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    if (!value || value === "") return null;

    return (
        <div className="mx-1 mt-2 pl-4 border-l-4 border-blue-700 cursor-pointer" {...props} ref={ref}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <p className="text-sm italic text-gray-600 truncate">
                            {value.length > 20 ? value.slice(0, 17) + '...' : value}
                        </p>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                        {value}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
})

// BookmarkDescriptionItem
interface BookmarkDescriptionItemProps {
    value: string;
    onEdit: () => void;
}
const BookmarkDescriptionItem = forwardRef(({
    value,
    onEdit
}: BookmarkDescriptionItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    const handleClick = useSingleAndDoubleClick(
        () => { },
        () => onEdit(),
        450
    );

    if (!value || value === "") return null;

    return (
        <div className="mt-4 text-xm mb-1 text-gray-600 cursor-pointer" onClick={handleClick} ref={ref}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <p className="text-left text-sm text-gray-600 truncate whitespace-pre-line">
                            {value.length > 20 ? value.slice(0, 17) + '...' : value}
                        </p>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                        {value}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>


    )
})

// BookmarkAuthorItem
interface BookmarkAuthorItemProps {
    value: string;
}
const BookmarkAuthorItem = forwardRef(({
    value,
    ...props
}: BookmarkAuthorItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <p className="text-sm text-gray-600 mt-2" {...props} ref={ref}>
            {value}
        </p>
    )
})

// BookmarkUpdatedDateItem
interface BookmarkUpdatedDateItemProps {
    value: string;
}
const BookmarkUpdatedDateItem = forwardRef(({
    value,
    ...props
}: BookmarkUpdatedDateItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <p className="text-xs text-gray-600" {...props} ref={ref}>
            {formatDateWithTime(value)}
        </p>
    )
})

// BookmarkItemLayout
interface BookmarkItemLayoutProps {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void
}
const BookmarkItemLayout = forwardRef(({
    children,
    onClick,
    ...props
}: BookmarkItemLayoutProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <div className={cn('px-2 mt-2 mb-4 cursor-pointer')} {...props} ref={ref} onClick={onClick}>
            {children}
        </div>
    )
})

// BookmarkItemContainer
interface BookmarkItemContainerProps {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void
    className: string;
}
const BookmarkItemContainer = forwardRef(({
    children,
    onClick,
    className,
    ...props
}: BookmarkItemContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <BookmarkItemLayout ref={ref} onClick={onClick} {...props}>
            <div className={cn('flex flex-col hover:bg-[#E5E5E5] rounded-md mb-4', className)} {...props}>
                {children}
            </div>
        </BookmarkItemLayout>
    )
})

// BookmarkItem
interface BookmarkItemProps {
    item: Bookmark;
    selected: boolean;
    onClickContent: () => void;
    onEdit: () => void;
    onDelete: () => void;
    categories: BookmarkCategory[];
    onMoveToCategory: (category: BookmarkCategory | null) => void;
}
const BookmarkItem = forwardRef(({
    item,
    selected,
    onClickContent,
    onEdit,
    onDelete,
    categories,
    onMoveToCategory,
    ...props
}: BookmarkItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    const { t } = useTranslation();

    const handleClick = useSingleAndDoubleClick(
        () => { },
        () => onEdit(),
        450
    );

    return (
        <BookmarkItemContainer className={cn(selected && "bg-[#E5E5E5]")} onClick={() => {
            onClickContent()
            handleClick()
        }} {...props} ref={ref}>
            <div className="flex justify-between items-center pl-0 cursor-pointer flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Bookmark className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium truncate text-ellipsis">
                        {item.title.length > 20 ? item.title.slice(0, 17) + '...' : item.title}
                    </span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="icon"
                            className="h-6 w-6 flex-shrink-0"
                        >
                            <More className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-30">
                        <DropdownMenuItem onClick={() => onEdit()}>
                            {t('bookmarks.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete()} className="text-red-600">
                            {t('bookmarks.delete')}
                        </DropdownMenuItem>
                        {categories.length > 0 && <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                {t('bookmarks.move')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                                    {item.categoryId && <DropdownMenuItem onClick={() => onMoveToCategory(null)}>
                                        <span>Uncategorised</span>
                                    </DropdownMenuItem>}
                                    {categories.filter(data => data.id !== item.categoryId).map((category, index) => (
                                        <DropdownMenuItem key={index} onClick={() => onMoveToCategory(category)}>
                                            <span>{category.name}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <BookmarkContentItem value={item.content} />
            <BookmarkDescriptionItem value={item.description ?? ""} onEdit={onEdit} />
            <BookmarkAuthorItem value={item.author} />
            <BookmarkUpdatedDateItem value={item.updatedAt} />
        </BookmarkItemContainer>
    )
})

// BookmarkEditItem
interface BookmarkEditItemProps {
    item: Bookmark;
    onDone: (title: string, description: string) => void;
}
const BookmarkEditItem = forwardRef(({
    item,
    onDone
}: BookmarkEditItemProps, _: ForwardedRef<HTMLFormElement>) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleConfirm = (title: string, description: string) => {
        if (title.length >= 1) {
            onDone(title, description)
        }
    }

    const handleKeyDownTitle = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key == "Escape") {
            e.preventDefault()
            handleConfirm(item.title, item.description ?? "")
            form.reset();
        }
    }

    const handleKeyDownDescription = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key == "Escape") {
            e.preventDefault()
            handleConfirm(item.title, item.description ?? "")
            form.reset();
        }
        else if (e.key === "Enter") {
            if (e.altKey || e.ctrlKey) {
                e.preventDefault()
                const cursorPosition = e.currentTarget.selectionStart
                const description = form.getValues("description")
                const newValue = description.substring(0, cursorPosition) + "\n" + description.substring(cursorPosition)
                form.setValue("description", newValue)

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.selectionStart = cursorPosition + 1
                        textareaRef.current.selectionEnd = cursorPosition + 1
                    }
                }, 0)
            } else {
                e.preventDefault()
                form.handleSubmit(onSubmit)()
            }
        }
    }

    const formSchema = z.object({
        title: z.string().min(1, {
            message: "Title must be at least 1 characters."
        }).max(255, {
            message: "Title must be less than 255 characters."
        }),
        description: z.string().max(255, {
            message: "Description must be less than 255 characters."
        }).optional(),
    })

    const form = useForm<any>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: item.title,
            description: item.description,
        },
    });

    function onSubmit(data: any) {
        handleConfirm(data.title, data.description)
        form.reset();
    }

    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        const titleInput = formRef.current?.querySelector('input[name="title"]') as HTMLInputElement;
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }
    }, []);

    return (
        <BookmarkItemContainer className="hover:bg-transparent" onClick={() => { }}>
            <Form {...form}>
                <form
                    ref={formRef}
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-2">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        onKeyDown={handleKeyDownTitle}
                                        className={cn(
                                            form.formState.errors.title && "border-red-500 focus-visible:ring-red-500"
                                        )}
                                        placeholder="Title"
                                        {...field}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <BookmarkContentItem value={item.content} />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea
                                        className={cn(
                                            form.formState.errors.description && "border-red-500 focus-visible:ring-red-500"
                                        )}
                                        placeholder="Add a description..." {...field}
                                        onKeyDown={handleKeyDownDescription}
                                        ref={textareaRef}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </form>
            </Form>
            <BookmarkAuthorItem value={item.author} />
            <BookmarkUpdatedDateItem value={item.updatedAt} />
        </BookmarkItemContainer>
    )
})
