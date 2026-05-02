import { useContext } from './use-context';
export function useState() {
    return useContext().state;
}
