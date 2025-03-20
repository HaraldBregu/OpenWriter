import { Box, Drawer, styled } from "@mui/material";
import { lazy, useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import { useSelector } from "react-redux";
import { getSidebarOpen } from "./store/main.selector";

const EditorComponent = lazy(() => import('../Editor'));

const drawerWidth = 280;

const Main = styled('main', {
    shouldForwardProp: (prop) => prop !== 'open'
})<{
    open?: boolean;
}>(({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    width: '100%',
    ...(open && {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: `${drawerWidth}px`,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const MainContainer = () => {
    const [open, setOpen] = useState(false);
    const sidebarOpen = useSelector(getSidebarOpen);

    useEffect(() => {
        setOpen(sidebarOpen);
    }, [sidebarOpen])

    return (
        <Box sx={{ display: 'flex' }}>
            <Drawer
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
                variant="persistent"
                anchor="left"
                open={open}
            >
                <Sidebar />
            </Drawer>
            <Main open={open}>
                <EditorComponent open={open} />
            </Main>
        </Box>
    );
}

export default MainContainer;