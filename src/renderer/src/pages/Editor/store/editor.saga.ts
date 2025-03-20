import { call, put, takeLatest } from 'redux-saga/effects';
import { fetchDataStart, fetchDataSuccess, fetchDataFailure } from './editor.slice';

function* fetchDataSaga() {
    try {
        const data: string[] = yield call(fetchDataFromAPI);
        yield put(fetchDataSuccess(data));
    } catch (error) {
        console.log('Error fetching data:', error);
        yield put(fetchDataFailure());
    }
}

function fetchDataFromAPI(): Promise<string[]> {
    return new Promise((resolve) =>
        setTimeout(() => resolve(['Item 1', 'Item 2', 'Item 3']), 1000)
    );
}

export default function* editorSaga() {
    yield takeLatest(fetchDataStart.type, fetchDataSaga);
}
