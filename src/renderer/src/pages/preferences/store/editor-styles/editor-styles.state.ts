export type StylesState = {
    styles: Style[];
}

export const stylesState: StylesState= {
    styles: [
        {
            type: "TITLE",
            enabled: true,
            name: "Title",
            fontSize: "18pt",
            fontWeight: "bold",
            fontFamily: "Times New Roman",
            color: "#000000",
            align: "center",
            lineHeight: "1.5",
            marginTop: "24pt",
            marginBottom: "12pt"
        },
        {
            type: "H1",
            enabled: true,
            name: "Heading 1",
            fontSize: "16pt",
            fontWeight: "bold",
            fontFamily: "Times New Roman",
            color: "#000000",
            align: "left",
            lineHeight: "1.4",
            marginTop: "20pt",
            marginBottom: "12pt"
        },
        {
            type: "H2",
            enabled: true,
            name: "Heading 2",
            fontSize: "14pt",
            fontWeight: "bold",
            fontFamily: "Times New Roman",
            color: "#000000",
            align: "left",
            lineHeight: "1.4",
            marginTop: "18pt",
            marginBottom: "10pt"
        },
        {
            type: "H3",
            enabled: true,
            name: "Heading 3",
            fontSize: "12pt",
            fontWeight: "bold",
            fontFamily: "Times New Roman",
            color: "#000000",
            align: "left",
            lineHeight: "1.3",
            marginTop: "16pt",
            marginBottom: "8pt"
        },
        {
            type: "H4",
            enabled: true,
            name: "Heading 4",
            fontSize: "12pt",
            fontWeight: "bold",
            fontFamily: "Times New Roman",
            color: "#000000",
            align: "left",
            lineHeight: "1.3",
            marginTop: "14pt",
            marginBottom: "6pt"
        },
        {
            type: "H5",
            enabled: true,
            name: "Heading 5",
            fontSize: "10pt",
            fontWeight: "bold",
            fontFamily: "Times New Roman",
            color: "#000000",
            align: "left",
            lineHeight: "1.2",
            marginTop: "12pt",
            marginBottom: "6pt"
        }
    ]
};