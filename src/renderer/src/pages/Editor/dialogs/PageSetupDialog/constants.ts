import { AvailableApparatusTypes, LayoutType, TLayout } from "../../store/layout/layout.state";

export const defaultLayout = 'vertical-horizontal'


export const sectionLayouts = {
    toc: [{visible: () => true, name: 'vertical-horizontal' }],
    intro: [
      {visible: () => true, name: 'vertical-horizontal' },
      {visible: () => true, name: 'vertical-vertical' },
    ],
    critical: [
      {visible: () => true, name: 'vertical-horizontal' },
      {visible: (apparatusColDetails) => apparatusColDetails.length > 1, name: 'horizontal-horizontal' },
      {visible: () => true, name: 'vertical-vertical' },
      {visible: () => true, name: 'vertical-vertical-reverse'},
    ],
    bibliography: [
      {visible: () => true, name: 'vertical-horizontal' },
      {visible: () => true, name: 'vertical-vertical' },
    ]
  } as {[k: string]: TLayout[]}

  export type TSettingsLayout = {
    [key in LayoutType]?:AvailableApparatusTypes
  }

  export const MAX_APPARATUS_NUMBER = 8;

  export const settingsLayout:TSettingsLayout = {
    ["vertical-horizontal"]: {
        critical: {
            columnDetails: {
                text:{columnNr: 4},
                critical: {columnNr: 2}, 
                pageNotes: {columnNr: 2}, 
                sectionNotes: {columnNr: 2},
                outerMargin:{columnNr:1},
                innerMargin:{columnNr:1}
            }
        },
        toc: {
            columnDetails: {
                text: {columnNr: 1}
            }
        },
        intro: {
            columnDetails: {
                text: {columnNr: 2}, 

            }
        },
        bibliography: {
            columnDetails: {
                text: {columnNr: 2},
            }
        },
    },
    ["vertical-vertical"]: {
        critical: {
            columnDetails: {
                text:{columnNr: 1},
                critical: {columnNr: 1}, 
                pageNotes: {columnNr: 1}, 
                sectionNotes: {columnNr: 1},
                innerMargin:{columnNr: 1},
                outerMargin:{columnNr: 1}
            }
        },
        toc: {
            columnDetails: {
                text: {columnNr: 1}
            }
        },
        intro: {
            columnDetails: {
                text: {columnNr: 2}, 
            }
        },
        bibliography: {
            columnDetails: {
                text: {columnNr: 2},
            }
        },
    },
    ["vertical-vertical-reverse"]: {
        critical: {
            columnDetails: {
                text:{columnNr: 1},
                critical: {columnNr: 1}, 
                pageNotes: {columnNr: 1}, 
                sectionNotes: {columnNr: 1},
                innerMargin:{columnNr: 1},
                outerMargin:{columnNr: 1}
               
            }
        },
        toc: {
            columnDetails: {
                text: {columnNr: 1}
            }
        },
    
        bibliography: {
            columnDetails: {
                text: {columnNr: 2},
            }
        },
    },
    ["horizontal-horizontal"]: {
        critical: {
            columnDetails: {
             text:{columnNr: 4},
                critical: {columnNr: 2}, 
                pageNotes: {columnNr: 2}, 
                sectionNotes: {columnNr: 2},
                outerMargin:{columnNr:1},
                innerMargin:{columnNr:1}
            }
        },
        toc: {
            columnDetails: {
                text: {columnNr: 1}
            }
        },

        bibliography: {
            columnDetails: {
                text: {columnNr: 2},
            }
        },
    },
  };