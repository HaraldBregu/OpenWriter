import { combineReducers } from '@reduxjs/toolkit';
import editorReducer from '../pages/Editor/store/editor.slice';
import commentsReducer from '../pages/Comments/store/comments.slice';
import mainReducer from '../pages/MainContainer/store/main.slice';



const rootReducer = combineReducers({
  main: mainReducer,
  editor: editorReducer,
  comments: commentsReducer,
});

export default rootReducer;