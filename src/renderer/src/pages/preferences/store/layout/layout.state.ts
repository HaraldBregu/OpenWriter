export type LayoutType = 'vertical-horizontal' | 'horizontal-horizontal' | 'vertical-vertical' | 'vertical-vertical-reverse'
 
export type TLayout = {
    name: LayoutType
    visible: (v: unknown[]) => boolean,
}
 
 
export type TElement = {
    id: string,
    title: string,
    columns: number,
    sectionType: string,
    disabled: boolean,
    type: 'text' | 'apparatus',
    visible: boolean
}
 
type PaperSizeName = `A${3 | 4 | 5 | 6}` | 'custom'
 
 
export type SetupSettingsState = {
    setupDialogState: SetupDialogStateType,
    sort: SetupDialogStateKeys[],
    setupOption: SetupOptionType,
}
 
export type StandardPageDimensionsState = {
    name: string,
    width: number,
    height: number,
}
 
export type ApparatusTypes = 'text' | 'critical' | 'pageNotes' | 'sectionNotes' | 'innerMargin' | 'outerMargin'
 
export type ColDetailsType = { columnNr: number }
 
export type AvailableApparatusTypes = {
    [key in SetupDialogStateKeys]?: {
        columnDetails: {
            [key in ApparatusTypes]?: ColDetailsType
        }
    }
}
 
export type SetupPageState = {
    settings: SetupSettingsState,
    standardPageDimensions: StandardPageDimensionsState[],
    availableApparatusTypes: AvailableApparatusTypes
}
 
type StandardPageDimension = {
    name: PaperSizeName,
    width: number,
    height: number,
}
 
// This is the initial state for the setup page in the editor
 
const setupOption: SetupOptionType = {
    template_type: 'Personal', // 'Personal' | 'Community'
    paperSize_name: "A4",
    paperSize_width: 21.0,
    paperSize_height: 29.7,
    paperSize_orientation: 'horizontal',
    header_show: true,
    header_weight: 1,
    footer_show: true,
    footer_weight: 1,
    margin_top: 1,
    margin_bottom: 1,
    margin_left: 1,
    margin_right: 1,
    innerMarginNote_show: true,
    innerMarginNote_weight: 1,
    outerMarginNote_show: true,
    outerMarginNote_weight: 1,
}
 
const defaultLayout = 'vertical-horizontal'
 
const sort: SetupDialogStateKeys[] = ['toc', 'intro', 'critical', 'bibliography']
 
//initial state text/apparatus in layout
export const setupDialogState: SetupDialogStateType = {
    toc: {
        visible: true,
        required: false,
        layout: defaultLayout,
        apparatusDetails: [{
            id: 'element1',
            title: 'Text',
            sectionType: "text",
            type: 'text',
            columns: 1,
            disabled: true,
            visible: true
        }],
 
    },
    intro: {
        visible: false,
        required: false,
        layout: defaultLayout,
        apparatusDetails: [{
            id: 'element1',
            title: 'Text',
            sectionType: "text",
            type: 'text',
            columns: 2,
            disabled: true,
            visible: true
        }],
    },
    critical: {
        visible: true,
        required: true,
        layout: defaultLayout,
        apparatusDetails: [{
            id: 'element1',
            title: 'Text',
            sectionType: "text",
            type: 'text',
            columns: 1,
            disabled: true,
            visible: true
        }, {
            id: 'apparatus1',
            title: 'Apparatus notes',
            type: 'apparatus',
            sectionType: "critical",
            columns: 1,
            disabled: true,
            visible: true
 
        }],
    },
    bibliography: {
        visible: false,
        required: false,
        layout: defaultLayout,
        apparatusDetails: [{
            id: 'element1',
            title: 'Text',
            sectionType: "text",
            type: 'text',
            columns: 2,
            disabled: true,
            visible: true
        }],
    }
}
 
const standardPageDimensions: StandardPageDimension[] = [
    {
        name: 'A3',
        width: 29.7,
        height: 42,
    },
    {
        name: 'A4',
        width: 21.0,
        height: 29.7,
    },
    {
        name: 'A5',
        width: 14.8,
        height: 21,
    },
    {
        name: 'A6',
        width: 10.5,
        height: 14.8,
    }
]
 
const settings = { setupDialogState, sort, setupOption }
 
const availableApparatusTypes: AvailableApparatusTypes = {
    critical: {
        columnDetails: {
            text: { columnNr: 4 },
            critical: { columnNr: 4 },
            pageNotes: { columnNr: 4 },
            sectionNotes: { columnNr: 4 },
            innerMargin: { columnNr: 1 },
            outerMargin: { columnNr: 1 }
        }
    },
    toc: {
        columnDetails: {
            text: { columnNr: 1 }
        }
    },
    intro: {
        columnDetails: {
            text: { columnNr: 2 },
        }
    },
    bibliography: {
        columnDetails: {
            text: { columnNr: 2 },
        }
    },
}
 
export type Section = {
    [key in SetupDialogStateKeys]: {
        columnDetails: { [key in ApparatusTypes]?: ColDetailsType; };
    };
}
 
export const setupPageInitialState: SetupPageState = {
    settings, standardPageDimensions, availableApparatusTypes
}
 
 
 