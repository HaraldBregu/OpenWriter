import { Suspense } from "react";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

type LazyLoaderProps = {
    child: React.ReactNode;
};

const Fallback: JSX.Element = (<Box sx={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%'
}}>
    <CircularProgress size="3rem" />
</Box>)

const FallbackLoader = () => Fallback;

const LazyLoader: React.FC<LazyLoaderProps> = ({ child }) => {
    return (
        <Suspense fallback={
            Fallback
        }>
            {child}
        </Suspense>
    );
};

export { LazyLoader, FallbackLoader };