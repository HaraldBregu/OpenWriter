import { Tab } from '@mui/material';
import './CustomTab.css';

export interface TabPanelProps {
    index: number;
    value: number;
    area: string;
    clickHdlr: (id: number) => void;
}

const CustomTab = ({value, index, area, clickHdlr}: TabPanelProps) => {
    const isChecked = value === index
    const internalTab = (
        <div
            style={{backgroundColor: isChecked ? '#455B71' : 'inherit'}}
            onClick={() => clickHdlr(index)}
            className="c-custom-tab__internal"
        >
            <span
                style={{ color: isChecked ? '#fff' : 'black' }}
                className="material-symbols-outlined"
            >
                {area}
            </span>
        </div>
    );

    return (
        <Tab
            style={{
                height: '32px',
                display: 'flex',
                justifyContent: 'center',
                alignContent: 'baseline',
                minWidth: 'auto',
            }}
            label={internalTab}
        />
    );
}

export default CustomTab
