import Grid from '@mui/material/Grid2';
import { IconButton, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { addCategory } from './store/comments.slice';
import { getAllCategories } from './store/comments.selector';
import { useEffect } from 'react';
import Category from './components/Category';
import styles from './index.module.css';

const Comments = (): JSX.Element => {
    const dispatch = useDispatch();
    const CommentsData = useSelector(getAllCategories);

    useEffect(() => {
        console.log(CommentsData)

        return (): void => {
            console.log('cleanup')
        }
    }, [CommentsData])


    const handleAddCategory = (): void => {
        const index = CommentsData.length + 1;
        dispatch(addCategory({ name: 'Category ' + index }));
    };

    return <Grid container spacing={1} padding={1}>
        <Grid container direction={'row'} justifyContent={'space-between'} size={12}>
            <Typography variant={'subtitle2'} fontSize={11}>Comments</Typography>
            <IconButton sx={{ padding: 0 }} onClick={handleAddCategory}>
                <span className={styles['add-comment']} style={{ fontSize: '20px !important' }}>add</span>
            </IconButton>
        </Grid>
        <Grid size={12} padding={1} sx={{ p: 0 }}>
            {CommentsData.length > 0 ? CommentsData.map((category, index) => (
                <Category key={index} id={category.id} initialTitle={category.name} comments={category.comments} />
            )) : <span className="font-bold">No comments yet...</span>}
        </Grid>
    </Grid>;
}

export default Comments;