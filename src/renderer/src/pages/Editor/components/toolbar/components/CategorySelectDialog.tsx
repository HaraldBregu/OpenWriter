import React from 'react';
import {
    // DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemText,
    Popover
} from '@mui/material';
import { CategoryState } from '../../../../Comments/store/comments.slice';

interface CategorySelectionDialogProps {
    open: boolean;
    anchorEl: HTMLElement | null;
    categories: CategoryState[];
    onClose: () => void;
    onCategorySelect: (categoryId: string) => void;
}

const CategorySelectionDialog: React.FC<CategorySelectionDialogProps> = ({
    open,
    anchorEl,
    categories,
    onClose,
    onCategorySelect
}) => {
    // Utilizziamo Popover invece di Dialog per ancorare al pulsante
    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'center',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'center',
            }}
            PaperProps={{
                sx: {
                    minWidth: '150px',
                    maxWidth: '200px',
                    borderRadius: '5px',
                    overflow: 'hidden',
                    marginTop: '8px',
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.15)'
                }
            }}
        >
            {/* <DialogTitle sx={{
                bgcolor: 'primary.secondary',
                color: 'primary.main',
                fontSize: '14px',
                fontWeight: 600,
                py: 1.5
            }}>
                Select Category
            </DialogTitle> */}
            <DialogContent sx={{ p: 0 }}>
                <List disablePadding>
                    {categories.map((category) => (
                        <ListItem
                            key={category.id}
                            component="button"
                            onClick={() => onCategorySelect(category.id)}
                            sx={{
                                backgroundColor: 'background.paper',
                                borderRadius: 0,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:last-child': {
                                    borderBottom: 'none'
                                },
                                '&:hover': {
                                    bgcolor: 'action.hover'
                                },
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 16px'
                            }}
                        >
                            <ListItemText
                                primary={category.name || "Category X"}
                                primaryTypographyProps={{
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    textAlign: 'center'
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            </DialogContent>
        </Popover>
    );
};

export default CategorySelectionDialog;