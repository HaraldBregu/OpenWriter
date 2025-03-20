import { Box, Tabs, Tab } from '@mui/material';
import { useState } from 'react';
import './index.css'
import Comments from '../Comments';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 0 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export default function Sidebar() {
    const [value, setValue] = useState(0);

    const handleChange = (_: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
    };

    return (
        <Box sx={{
            width: 'auto',
            minWidth: '200px',
            maxWidth: '100%',
            height: '100%'
        }}>
            <Box sx={{ borderBottom: 0 }}>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    variant="fullWidth"
                    sx={{
                        '& .MuiTabs-indicator': {
                            display: 'none'
                        }
                    }}
                >
                    <Tab
                        label={<span className="material-symbols-outlined">
                            chat
                        </span>}
                        sx={{
                            minWidth: '70px',
                            bgcolor: value === 0 ? '#fff' : '#e0e0e0',
                            borderBottom: value === 0 ? 'none' : '1px solid rgba(0, 0, 0, 0.12)'
                        }}
                    />
                    <Tab
                        label={<span className="material-symbols-outlined">
                            bookmark
                        </span>}
                        sx={{
                            minWidth: '70px',
                            bgcolor: value === 1 ? '#fff' : '#e0e0e0',
                            borderBottom: value === 1 ? 'none' : '1px solid rgba(0, 0, 0, 0.12)'
                        }}
                    />
                    <Tab
                        label={<span className="material-symbols-outlined">
                            format_list_bulleted
                        </span>}
                        sx={{
                            minWidth: '70px',
                            bgcolor: value === 2 ? '#fff' : '#e0e0e0',
                            borderBottom: value === 2 ? 'none' : '1px solid rgba(0, 0, 0, 0.12)'
                        }}
                    />
                </Tabs>
            </Box>
            <TabPanel value={value} index={0}>
                <Comments />
            </TabPanel>
            <TabPanel value={value} index={1}>
                Bookmarks content
            </TabPanel>
            <TabPanel value={value} index={2}>
                List content
            </TabPanel>
        </Box>
    );
}
