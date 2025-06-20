import { ForwardedRef, forwardRef, ReactElement, useEffect, useImperativeHandle, useRef, useState } from "react";
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
import Comment from "@/components/icons/Comment";
import More from "./icons/More";
import Dropdown from "./icons/Dropdown";
import { format } from "date-fns";

interface CommentsProps {
    title: string;
    categories: CommentCategory[];
    items: AppComment[];
    selectedComment?: AppComment | null;
    onCreateCategory: () => void;
    onUpdateCategory: (category: CommentCategory) => void;
    onDeleteCategory: (category: CommentCategory, comments: AppComment[], categories: CommentCategory[]) => void;
    onEditComment: (comment: AppComment) => void;
    onDeleteComment: (comment: AppComment) => void;
    onClickComment: (comment: AppComment) => void;
    onMoveCommentToCategory: (comment: AppComment, category: CommentCategory | null) => void;
}

const AppComments = forwardRef(({
    title,
    categories,
    items,
    selectedComment,
    onCreateCategory,
    onUpdateCategory,
    onDeleteCategory,
    onEditComment,
    onDeleteComment,
    onClickComment,
    onMoveCommentToCategory
}: CommentsProps, ref: ForwardedRef<unknown>) => {
    useImperativeHandle(ref, () => {
        return {
            createComment: (id: string, categoryId?: string) => {
                const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                (async () => {
                    await delay(100);
                    setEditingCommentId(id);

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
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
    const [error, setError] = useState(false)

    const toggleSection = (category: CommentCategory, index: number) => {
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
        const categoryId = selectedComment?.categoryId
        if (categoryId) {
            setExpandedCategoryIds(prev => {
                if (prev.includes(categoryId))
                    return prev

                return [...prev, categoryId]
            })
        }

        setTimeout(() => {
            const element = itemRefs.current[selectedComment?.id ?? ""];
            element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);

    }, [selectedComment])

    const handleMoveToCategory = (comment: AppComment, category: CommentCategory | null) => {
        onMoveCommentToCategory(comment, category)

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        (async () => {
            await delay(100);
            setExpandedCategoryIds(prev => {
                if (prev.includes(category?.id ?? ""))
                    return prev
                return [...prev, category?.id ?? ""]
            })
            await delay(300);
            const element = itemRefs.current[comment.id];
            window.scrollTo({
                top: element?.offsetTop,
                behavior: "smooth"
            })
        })();
    }

    return (
        <AppCommentsContainer>
            <AppCommentsHeaderContainer>
                <h4 className="text-xs font-medium">{title}</h4>
                <Button
                    intent="secondary"
                    variant="icon"
                    size="iconSm"
                    icon={<PlusSimple intent='primary' variant='tonal' size='small' />}
                    onClick={onCreateCategory}
                />
            </AppCommentsHeaderContainer>
            <AppCommentsBodyContainer>

                {/* Not categorized items */}
                {items.filter(data => !data.categoryId).map((item) => {
                    if (item.id === editingCommentId) {
                        return (
                            <CommentEditItem
                                key={item.id}
                                item={item}
                                onDone={(description) => {
                                    setEditingCommentId(null)
                                    onEditComment({ ...item, description })
                                }}
                            />
                        )
                    } else {
                        return (
                            <CommentItem
                                key={item.id}
                                ref={el => itemRefs.current[item.id] = el}
                                item={item}
                                selected={selectedComment?.id === item.id}
                                categories={categories}
                                onClickContent={() => onClickComment(item)}
                                onEdit={() => setEditingCommentId(item.id)}
                                onDelete={() => onDeleteComment(item)}
                                onMoveToCategory={(category) => handleMoveToCategory(item, category)}
                            />
                        );
                    }
                })}

                {/* Categorized items */}
                {categories.map((category, index) => (
                    <div className="mb-4" key={index}>
                        <AppCommentsCategoryHeaderContainer onClick={() => toggleSection(category, index)}>
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
                                                {t('comments.edit')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation()
                                                onDeleteCategory(category, items.filter(data => data.categoryId === category.id), categories)
                                            }} className="text-red-600">
                                                {t('comments.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </AppCommentsCategoryHeaderContainer>
                        {expandedCategoryIds.includes(category.id) && items.filter(data => data.categoryId === category.id).map(item => {
                            if (item.id === editingCommentId) {
                                return (
                                    <CommentEditItem
                                        key={item.id}
                                        item={item}
                                        onDone={(description) => {
                                            setEditingCommentId(null)
                                            onEditComment({ ...item, description })
                                        }}
                                    />
                                )
                            } else {
                                return (
                                    <CommentItem
                                        key={item.id}
                                        ref={el => itemRefs.current[item.id] = el}
                                        item={item}
                                        selected={selectedComment?.id === item.id}
                                        categories={categories}
                                        onClickContent={() => onClickComment(item)}
                                        onEdit={() => setEditingCommentId(item.id)}
                                        onDelete={() => onDeleteComment(item)}
                                        onMoveToCategory={(category) => handleMoveToCategory(item, category)}
                                    />
                                );
                            }
                        }
                        )}
                    </div>
                ))}
            </AppCommentsBodyContainer>
        </AppCommentsContainer>
    )
})

export default AppComments;

// AppCommentsContainer
interface AppCommentsContainerProps {
    children: React.ReactNode;
}
const AppCommentsContainer = forwardRef(({
    children,
    ...props
}: AppCommentsContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <div className="flex flex-col h-full" {...props} ref={ref}>
            {children}
        </div>
    )
})

// AppCommentsHeaderContainer
interface AppCommentsHeaderContainerProps {
    children: React.ReactNode;
}
const AppCommentsHeaderContainer = forwardRef(({
    children,
    ...props
}: AppCommentsHeaderContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <>
            <div className="flex justify-between items-center p-2 sticky top-0 z-10" {...props} ref={ref}>
                {children}
            </div>
        </>
    )
})

// AppCommentsBodyContainer
interface AppCommentsBodyContainerProps {
    children: React.ReactNode;
}
const AppCommentsBodyContainer = forwardRef(({
    children,
    ...props
}: AppCommentsBodyContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <>
            <div className="flex-1 overflow-y-auto pt-2" {...props} ref={ref}>
                {children}
            </div>
        </>
    )
})

// AppCommentsCategoryHeaderContainer
interface AppCommentsCategoryHeaderContainerProps {
    children: React.ReactNode;
    onClick: () => void;
}
const AppCommentsCategoryHeaderContainer = forwardRef(({
    onClick,
    children,
    ...props
}: AppCommentsCategoryHeaderContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
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

// CommentContentItem
interface CommentContentItemProps {
    value: string;
    className: string;
}
const CommentContentItem = forwardRef(({
    value,
    className,
    ...props
}: CommentContentItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    if (!value || value === "") return null;

    return (
        <div className={cn("mx-1 mt-2 pl-4 border-l-4 border-blue-700 cursor-pointer text-gray-600", className)} {...props} ref={ref}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <p className="text-sm italic truncate">
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

// CommentDescriptionItem
interface CommentDescriptionItemProps {
    value: string;
    className: string;
}
const CommentDescriptionItem = forwardRef(({
    value,
    className,
    ...props
}: CommentDescriptionItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    if (!value || value === "") return null;

    return (
        <div className={cn("mt-4 text-xm mb-1 text-gray-600 cursor-pointer", className)}{...props} ref={ref}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <p className="text-left text-sm truncate whitespace-pre-line">
                            {value.length > 150 ? value.slice(0, 147) + '...' : value}
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

// CommentItemLayout
interface CommentItemLayoutProps {
    onClick?: (e: React.MouseEvent) => void
    className?: string;
    children: ReactElement;
}
const CommentItemLayout = forwardRef(({
    onClick,
    className,
    children,
    ...props
}: CommentItemLayoutProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <div ref={ref} className={cn('px-2 mt-2 mb-4 cursor-pointer', className)} {...props} onClick={onClick}>
            {children}
        </div>
    )
})

// CommentItemContainer
interface CommentItemContainerProps {
    onClick?: (e: React.MouseEvent) => void
    children: React.ReactNode;
    className: string;
}
const CommentItemContainer = forwardRef(({
    children,
    onClick,
    className,
    ...props
}: CommentItemContainerProps, ref: ForwardedRef<HTMLDivElement>) => {
    return (
        <CommentItemLayout ref={ref} onClick={onClick} {...props} >
            <div className={cn('flex flex-col rounded-md mb-4', className)}>
                {children}
            </div>
        </CommentItemLayout>
    )
})

// CommentItem
interface CommentItemProps {
    item: AppComment
    selected: boolean
    onClickContent: () => void
    onEdit: () => void
    onDelete: () => void
    categories: CommentCategory[]
    onMoveToCategory: (category: CommentCategory | null) => void
}
const CommentItem = forwardRef(({
    item,
    selected,
    onClickContent,
    onEdit,
    onDelete,
    categories,
    onMoveToCategory,
    ...props
}: CommentItemProps, ref: ForwardedRef<HTMLDivElement>) => {
    const { t } = useTranslation();

    const handleClick = useSingleAndDoubleClick(
        () => { },
        () => { onEdit() },
        450
    );

    return (
        <CommentItemContainer
            ref={ref}
            className={cn(selected && "bg-[#0625AC] hover:none")}
            onClick={() => {
                onClickContent()
                handleClick()
            }} {...props}>
            <div className="flex justify-between items-center pl-0 cursor-pointer flex-1 min-w-0">
                <div className={cn("flex items-center gap-2 flex-1 min-w-0", selected && "text-white")} >
                    <Comment className={cn("h-5 w-5 flex-shrink-0")} fillcolor={selected ? "white" : null} />
                    <span className={cn("text-sm font-medium truncate text-ellipsis")}>
                        {item.author}
                        <p className="text-xs">
                            {format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                    </span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            size="icon"
                            variant="icon"
                            className={cn("h-6 w-6 flex-shrink-0", selected && "hover:bg-transparent")}
                        >
                            <More className={cn("h-4 w-4")} fillcolor={selected ? "white" : null} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-30">
                        <DropdownMenuItem onClick={() => onEdit()}>
                            {t('comments.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete()} className="text-red-600">
                            {t('comments.delete')}
                        </DropdownMenuItem>
                        {categories.length > 0 && <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                {t('comments.move')}
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
            <CommentContentItem value={item.content} className={cn(selected && "text-white border-white")} />
            <CommentDescriptionItem value={item.description ?? ""} className={cn(selected && "text-white")} />
        </CommentItemContainer>
    )
})

// CommentEditItem
interface CommentEditItemProps {
    item: AppComment;
    onDone: (description: string) => void;
}
const CommentEditItem = forwardRef(({
    item,
    onDone
}: CommentEditItemProps, _: ForwardedRef<HTMLFormElement>) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleKeyDownDescription = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key == "Escape") {
            e.preventDefault()
            onDone(item.description ?? "")
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
        description: z.string().max(2000, {
            message: "Description must be less than 2000 characters."
        }).optional(),
    })

    const form = useForm<any>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            description: item.description ?? "",
        },
    });

    function onSubmit(data: any) {
        onDone(data.description)
        form.reset();
    }

    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        const descriptionInput = formRef.current?.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
        if (descriptionInput) {
            descriptionInput.focus();
            descriptionInput.select();
        }
    }, []);

    return (
        <CommentItemContainer
            className="hover:bg-transparent"
            onClick={() => { }}>
            <Form {...form}>
                <form
                    ref={formRef}
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Comment className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm font-medium truncate text-ellipsis">
                            {item.author}
                            <p className="text-xs text-gray-600">
                                {format(new Date(item.updatedAt), 'dd/MM/yyyy HH:mm')}
                            </p>
                        </span>
                    </div>
                    <CommentContentItem value={item.content} className={cn()} />
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
        </CommentItemContainer>
    )
})
