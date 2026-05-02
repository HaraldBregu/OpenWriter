import { useContext } from './use-context';
export function useDispatch() {
    return useContext().dispatch;
}
