import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEditor } from "./hooks/useEditor"
import { memo, useMemo } from "react"
import { ThemeToggle } from "@/components/theme-toggle"

const EditorFooterLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <footer className="sticky bottom-0 z-50 flex h-8 shrink-0 items-center gap-2 border-t bg-background px-3">
            <div className="flex items-center w-full">
                {children}
            </div>
        </footer>
    )
}


/**
 * WordCount
 * @param count - the number of words
 * @returns 
 */
const WordCount = ({ count }: { count: number }) => {
    return (
        <div className="flex items-center gap-4 text-xs text-muted-foreground float-left font-medium">
            <span>Page 1 of 2</span>
            <span>{count} words</span>
        </div>
    )
}
WordCount.displayName = "WordCount"
const MemoizedWordCount = memo(WordCount)

/**
 * PageZoom
 * @description - the page zoom selector
 * @returns 
 */
const PageZoom = () => {
    return (
        <div className="flex items-center gap-4 ml-auto float-right">
            <div className="flex items-center gap-2">
                <Select defaultValue="100">
                    <SelectTrigger className="h-6 w-auto">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="75">75%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                        <SelectItem value="125">125%</SelectItem>
                        <SelectItem value="150">150%</SelectItem>
                        <SelectItem value="200">200%</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
PageZoom.displayName = "PageZoom"
const MemoizedPageZoom = memo(PageZoom)

/**
 * Footer
 * @description - the footer component
 * @returns 
 */
const Footer = () => {
    const [state] = useEditor();
    const wordCount = useMemo(() => state.words, [state.words])

    return (
        <>
            <EditorFooterLayout>
                <ThemeToggle />
                <MemoizedWordCount count={wordCount} />
                <MemoizedPageZoom />
            </EditorFooterLayout>
        </>
    )
}
Footer.displayName = "Footer"
export default memo(Footer);