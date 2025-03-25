import { Box, Tabs } from '@mui/material';
import { useState } from 'react';
import Comments from './Comments';
import TabPanel from '@/components/TabPanel/TabPanel';
import CustomTab from '@/components/CustomTab/CustomTab';
import Bookmark from '@/components/Bookmarks';
// import TableOfContents from '@/components/TableOfContents';

export default function Sidebar(): JSX.Element {
    const [value, setValue] = useState(0);

    const clickHdlr = (newValue: number): void => {
        setValue(newValue);
    };

    // const tocData = [{
    //     title: 'Chapter 1',
    //     children: [{
    //         title: 'Subchapter 1.1',
    //         children: [{
    //             title: 'Subsubchapter 1.1.1',
    //             children: [
    //                 {
    //                     title: 'Subsubsubchapter 1.1.1.1',
    //                     children: []
    //                 }
    //             ]
    //         }]
    //     }]
    // }]

    const tabs = [
        { title: 'chat', tab: <Comments /> },
        {
            title: 'bookmark', tab: <>
                <Bookmark title="Bookmark 1" description="Bookmark 1 action" action={() => {
                    console.log('Bookmark 1 action');
                }} /></>
        },
        {
            title: 'format_list_bulleted', tab: <> </>
        }
    ]

    return (
        <Box sx={{
            width: 'auto',
            minWidth: '200px',
            maxWidth: '100%',
            height: '100%',
            bgcolor: '#FAFAFA',
        }}>
            <Box sx={{ borderBottom: 0 }}>
                <Tabs
                    value={value}
                    variant="fullWidth"
                    sx={{
                        '& .MuiTabs-indicator': {
                            display: 'none'
                        },
                        height: '38px',
                        minHeight: '0px',

                    }}
                >
                    {tabs.map(({ title }, index) => (
                        <CustomTab
                            value={value}
                            index={index}
                            key={title}
                            area={title}
                            clickHdlr={clickHdlr}
                        />
                    ))}
                </Tabs>
            </Box>
            {tabs.map(({ title, tab }, index) => (
                <TabPanel value={value} index={index} key={title}>
                    {tab}
                </TabPanel>
            ))}
        </Box>
    );
}
