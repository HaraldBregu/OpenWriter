import React, { useState, useRef } from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CriterionTextBox from '../../../../components/ui/textField';
import { useDispatch } from 'react-redux';
import {
    updateCategoryTitle,
    updateCommentTitle,
    updateCommentContent,
    deleteComment,
    selectAnnotation
} from '../../store/comments.slice';
import Comment from '../singleComment';

interface CategoryProps {
    id: string;
    initialTitle: string;
    comments: CommentState[];
}

interface CommentState {
    id: string;
    title: string;
    selectedText: string;
    comment: string;
}

const Category: React.FC<CategoryProps> = ({ id, initialTitle, comments }) => {
    const dispatch = useDispatch();
    const [expanded, setExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(initialTitle);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleAccordionChange = () => {
        if (!isEditing) {
            setExpanded(!expanded);
        }
    };

    const startEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (e.detail !== 2) return;
        setIsEditing(true);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const handleTitleBlur = () => {
        setIsEditing(false);
        if (title !== initialTitle) {
            dispatch(updateCategoryTitle({ categoryId: id, title }));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
            if (title !== initialTitle) {
                dispatch(updateCategoryTitle({ categoryId: id, title }));
            }
        }
    };

    const handleCommentTitleChange = (commentId: string, newTitle: string) => {
        const commentToUpdate = comments.find(comment => comment.id === commentId);

        if (commentToUpdate && commentToUpdate.title !== newTitle) {
            dispatch(updateCommentTitle({
                categoryId: id,
                commentId,
                title: newTitle
            }));
        }
    };

    const handleCommentContentChange = (commentId: string, newComment: string) => {
        const commentToUpdate = comments.find(comment => comment.id === commentId);
        if (commentToUpdate && commentToUpdate.comment !== newComment) {
            dispatch(updateCommentContent({
                categoryId: id,
                commentId,
                content: newComment
            }));
        }
    };

    const handleAnnotationSelect = (annotation: string) => {
        dispatch(selectAnnotation({
            text: annotation
        }));
    };

    const handleDeleteComment = (commentId: string) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
        if (confirmDelete) {
            dispatch(deleteComment({
                categoryId: id,
                commentId
            }));
        }
    };

    return (
        <Accordion
            expanded={expanded}
            onChange={handleAccordionChange}
            sx={{
                mb: 1,
                padding: 0,
                boxShadow: 'none',
            }}
            disableGutters
        >
            <AccordionSummary
                expandIcon={!isEditing && <ExpandMoreIcon />}
                onClick={startEditing}
                sx={{
                    flexDirection: 'row-reverse',
                    padding: 0,
                    '& .MuiAccordionSummary-expandIconWrapper': {
                        marginRight: '8px',
                    },
                    '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                        marginY: isEditing ? 0.5 : 0,
                        marginLeft: 0
                    },
                }}
            >
                {isEditing ? (
                    <CriterionTextBox
                        inputRef={inputRef}
                        value={title}
                        onChange={handleTitleChange}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleKeyDown}
                        variant="outlined"
                        size="small"
                        fullWidth
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <Typography variant="subtitle1" component="div" sx={{ flexGrow: 1, fontSize: 12, fontWeight: 600 }}>
                        {title}
                    </Typography>
                )}
            </AccordionSummary>
            <AccordionDetails sx={{ padding: 0 }}>
                <Grid container spacing={0}>
                    {comments.map((comment) => (
                        <Grid key={comment.id} size={12}>
                            <Comment
                                id={comment.id}
                                initialTitle={comment.title}
                                initialAnnotation={comment.selectedText}
                                initialComment={comment.comment}
                                onTitleChange={handleCommentTitleChange}
                                onCommentChange={handleCommentContentChange}
                                onAnnotationSelect={handleAnnotationSelect}
                                onDelete={handleDeleteComment}
                            />
                        </Grid>
                    ))}
                </Grid>
            </AccordionDetails>
        </Accordion>
    );
};

export default Category;