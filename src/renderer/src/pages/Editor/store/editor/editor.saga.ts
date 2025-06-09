import { call } from 'redux-saga/effects';

//#DUMMY this is a dummy saga to demonstrate the structure
// It simulates fetching data from an API and can be replaced with actual logic later.
// @ts-ignore
function* fetchDataSaga() {
    try {
        // @ts-ignore
        const data: string[] = yield call(fetchDataFromAPI);
    } catch (error) {
        // console.log('Error fetching data:', error);
    }
}

function fetchDataFromAPI(): Promise<string[]> {
    return new Promise((resolve) =>
        setTimeout(() => resolve(['Item 1', 'Item 2', 'Item 3']), 1000)
    );
}

export default function* editorSaga() {
}
