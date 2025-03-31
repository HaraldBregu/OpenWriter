import React, { useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import { styled } from '@mui/material/styles';
import CriterionTextBox from '../../../../components/ui/textField';

interface CommentProps {
    id?: string;
    initialTitle: string;
    initialAnnotation: string;
    initialComment: string;
    onTitleChange?: (id: string, newTitle: string) => void;
    onCommentChange?: (id: string, newComment: string) => void;
    onAnnotationSelect?: (annotation: string) => void;
    onDelete?: (id: string) => void;
}

const AnnotationText = styled(Typography)(({ theme }) => ({
    backgroundColor: '#ededed',
    padding: theme.spacing(0.5),
    borderRadius: '5px',
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    cursor: 'pointer',
    fontSize: '0.675rem',
    lineHeight: 1.5,
    position: 'relative',
    width: 'auto',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'normal',
    '&:hover': {
        backgroundColor: '#fffdda',
    },
}));

const CommentContainer = styled(Box)(({ theme }) => ({
    padding: theme.spacing(0.5),
    marginBottom: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    position: 'relative',
}));

const Comment: React.FC<CommentProps> = ({
    id = '',
    initialTitle,
    initialAnnotation,
    initialComment,
    onTitleChange,
    onCommentChange,
    onAnnotationSelect,
    onDelete,
}) => {
    const [title, setTitle] = useState(initialTitle);
    const [annotation] = useState(initialAnnotation);
    const [comment, setComment] = useState(initialComment);
    // Separazione degli stati di modifica per titolo e commento
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingComment, setIsEditingComment] = useState(false);

    // Stato per il menu
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchorEl);

    // Gestisce la modifica del titolo
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    // Gestisce la modifica del commento
    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setComment(e.target.value);
    };

    // Salva le modifiche al titolo
    const saveTitle = () => {
        setIsEditingTitle(false);
        if (onTitleChange) onTitleChange(id, title);
    };

    // Salva le modifiche al commento
    const saveComment = () => {
        setIsEditingComment(false);
        if (onCommentChange) onCommentChange(id, comment);
    };

    // Gestisce la selezione dell'annotazione per riselezionarla nel testo
    const handleAnnotationClick = () => {
        if (onAnnotationSelect) onAnnotationSelect(annotation);
    };

    // Apre il menu
    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setMenuAnchorEl(event.currentTarget);
    };

    // Chiude il menu
    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    // Gestisce la selezione dell'edit dal menu
    const handleEditFromMenu = () => {
        setIsEditingTitle(true);
        setIsEditingComment(true);
        handleMenuClose();
    };

    // Gestisce l'eliminazione del commento
    const handleDelete = () => {
        if (onDelete) onDelete(id);
        handleMenuClose();
    };

    return (
        <CommentContainer>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                    position: 'relative',
                    height: '24px'
                }}
            >
                {isEditingTitle ? (
                    <CriterionTextBox
                        value={title}
                        onChange={handleTitleChange}
                        variant="outlined"
                        size="small"
                        fullWidth
                        autoFocus
                        InputProps={{
                            endAdornment: (
                                <IconButton onClick={saveTitle} size="small" color="primary">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>done</span>
                                </IconButton>
                            ),
                        }}
                    />
                ) : (
                    <Typography variant="subtitle1" component="h3" sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '11rem',
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px !important', marginRight: 5 }}>chat</span>
                        {title}
                    </Typography>
                )}
                {onDelete && !isEditingTitle && (
                    <>
                        <IconButton
                            size="small"
                            onClick={handleMenuOpen}
                            sx={{
                                color: 'text.secondary',
                                padding: '2px'
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px !important', fontWeight: 600 }}>more_vert</span>
                        </IconButton>
                        <Menu
                            anchorEl={menuAnchorEl}
                            open={menuOpen}
                            onClose={handleMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            <MenuItem onClick={handleEditFromMenu} sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                Edit
                            </MenuItem>
                            <MenuItem onClick={handleDelete} sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                Delete
                            </MenuItem>
                        </Menu>
                    </>
                )}
            </Box>
            <AnnotationText
                variant="body2"
                onClick={handleAnnotationClick}
                title={annotation}
            >
                <Box component="span" sx={{ opacity: 0.7, mr: 0.5 }}>{annotation}</Box>
            </AnnotationText>
            {isEditingComment ? (
                <Box sx={{ mt: 1 }}>
                    <CriterionTextBox
                        value={comment}
                        onChange={handleCommentChange}
                        variant="outlined"
                        size="small"
                        fullWidth
                        multiline
                        rows={4}
                        autoFocus
                        InputProps={{
                            endAdornment: (
                                <IconButton onClick={saveComment} size="small" color="primary">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>done</span>
                                </IconButton>
                            ),
                        }}
                    />
                </Box>
            ) : (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>{comment}</Typography>
                </Box>
            )}
        </CommentContainer>
    );
};

export default Comment;