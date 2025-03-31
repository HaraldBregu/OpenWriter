import React, { useState } from 'react';
import { BubbleMenu, Editor } from '@tiptap/react';
import { useDispatch, useSelector } from 'react-redux';
import { addComment, addCategory } from '../../../Comments/store/comments.slice';
import { getAllCategories } from '../../../Comments/store/comments.selector';
import { v4 as uuidv4 } from 'uuid';
import CategorySelectionDialog from '../toolbar/components/CategorySelectDialog';
import { setSidebarOpen } from '../../../store/main.slice';
import styles from '../../index.module.css';
import { Divider } from '@/components/ui/divider';
interface BubbleToolbarProps {
    editor: Editor;
    textColor: string;
    highlightColor: string;
    setTextColor: (color: string) => void;
    setHighlightColor: (color: string) => void;
}

const BubbleToolbar: React.FC<BubbleToolbarProps> = ({
    editor
}) => {
    const dispatch = useDispatch();
    const [openCategoryModal, setOpenCategoryModal] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const categories = useSelector(getAllCategories);

    const addCommentFromSelection = (
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const selectedContent = editor.state.doc.textBetween(from, to, ' ');

        if (!selectedContent) return;
        setSelectedText(selectedContent);
        dispatch(setSidebarOpen(true));


        if (categories.length === 0) {
            const defaultCategoryId = uuidv4()
            const index = categories.length + 1;
            dispatch(addCategory({
                id: defaultCategoryId,
                name: "Category " + index
            }));

            dispatch(addComment({
                categoryId: defaultCategoryId,
                comment: {
                    title: "New Comment",
                    selectedText: selectedContent,
                    comment: ""
                }
            }));
        } else if (categories.length === 1) {
            dispatch(addComment({
                categoryId: categories[0].id,
                comment: {
                    title: "New Comment",
                    selectedText: selectedContent,
                    comment: ""
                }
            }));
        } else {
            // dispatch(addComment({
            //     categoryId: categories[categories.length - 1].id,
            //     comment: {
            //         title: "New Comment",
            //         selectedText: selectedContent,
            //         comment: ""
            //     }
            // }));
            setAnchorEl(event.currentTarget);
            setOpenCategoryModal(true);
        }
    };

    const handleCategorySelect = (categoryId: string) => {
        dispatch(addComment({
            categoryId,
            comment: {
                title: "New Comment",
                selectedText: selectedText,
                comment: ""
            }
        }));

        handleCloseModal();
    };

    const handleCloseModal = () => {
        setOpenCategoryModal(false);
        setAnchorEl(null);
    };

    if (!editor) {
        return null;
    }

    return (
        <>
            <BubbleMenu
                editor={editor}
                tippyOptions={{
                    duration: 100,
                    placement: 'top',
                    offset: [0, 10],
                }}
                className={styles["bubble-menu"]}
            >
                <button
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={editor?.isActive("blockquote") ? "active" : ""}
                >
                    <span className="material-symbols-outlined">history_edu</span>
                </button>
                <Divider />
                <button
                    disabled
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={editor?.isActive("blockquote") ? "active" : ""}
                >
                    <span className="material-symbols-outlined">functions</span>
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={editor?.isActive("blockquote") ? "active" : ""}
                >
                    <span className="material-symbols-outlined">format_quote</span>
                </button>
                <Divider />
                <button
                    onClick={(e) => addCommentFromSelection(e)}
                    className={editor?.isActive("blockquote") ? "active" : ""}
                >
                    <span className="material-symbols-outlined">add_comment</span>
                </button>
                <button
                    disabled
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    className={editor?.isActive("blockquote") ? "active" : ""}
                >
                    <span className="material-symbols-outlined">add_link</span>
                </button>
            </BubbleMenu>
            <CategorySelectionDialog
                open={openCategoryModal}
                anchorEl={anchorEl}
                categories={categories}
                onClose={handleCloseModal}
                onCategorySelect={handleCategorySelect}
            />
        </>
    );
};

export default BubbleToolbar;