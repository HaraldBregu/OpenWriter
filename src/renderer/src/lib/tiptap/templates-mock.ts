export const sectionDelimiter = (type, label) => [{
    type: "sectionDivider",
    attrs: {
        sectionType: type,
        label: label,
    }
}]

const defaultJsonContent = {
    content: [
        {
            marks: [{
                type: "textStyle",
                attrs: {
                    fontFamily: "Times New Roman",
                    fontWeight: "normal",
                    letterSpacing: "normal",
                    color: "#000000",
                    fontSize: "12pt"
                }
            }],
            type: "text",
            text: "\u00A0" // Empty text node
        }
    ]
}

export const tocTemplate = (title?: string, content?: {} | any) => {
    const tocContent = [
        ...sectionDelimiter("toc", title),
        {
            type: "paragraph",
            attrs: {
                level: 2,
                sectionType: "toc",
                indent: 0,
                textAlign: 'left',
                lineHeight: 1,
                marginTop: 10,
                marginBottom: 10,
            },
        },
    ];

    if (content) {
        return [
            ...sectionDelimiter("toc", title),
            ...content,
        ];
    }

    return tocContent;
};

export const introTemplate = (title?: string, content?: {} | any) => {
    const introContent = [
        ...sectionDelimiter("introduction", title),
        {
            type: "paragraph",
            attrs: {
                level: 2,
                sectionType: "introduction",
                indent: 0,
                textAlign: 'left',
                lineHeight: 1,
                marginTop: 10,
                marginBottom: 10,
            },
            ...defaultJsonContent
        }
    ];

    if (content) {
        return [
            ...sectionDelimiter("introduction", title),
            ...content,
        ];
    }

    return introContent;
}

export const textTemplate = (title?: string, content?: {} | any) => {
    const textContent = [
        ...sectionDelimiter("maintext", title),
        {
            type: "paragraph",
            attrs: {
                level: 1,
                indent: 0,
            },    
        }
    ]

    if (content) {
        return [
            ...sectionDelimiter("maintext", title),
            ...content,
        ];
    }

    return textContent;
}

export const bibliographyTemplate = (title?: string, content?: {} | any) => {
    const bibliographyContent = [
        ...sectionDelimiter("bibliography", title),
        {
            type: "paragraph",
            attrs: {
                level: 2,
                sectionType: "bibliography",
                indent: 0,
                textAlign: 'left',
                lineHeight: 1,
                marginTop: 10,
                marginBottom: 10,
            },
            ...defaultJsonContent
        }
    ];

    if (content) {
        return [
            ...sectionDelimiter("bibliography", title),
            ...content,
        ];
    }

    return bibliographyContent;
}

export const appendixTemplate = (title?: string, content?: {} | any) => {
    const appendixContent = [
        ...sectionDelimiter("appendix", title),
        {
            type: "paragraph",
            attrs: {
                level: 2,
                sectionType: "appendix",
                indent: 0,
                textAlign: 'left',
                lineHeight: 1,
                marginTop: 10,
                marginBottom: 10,
            },
            ...defaultJsonContent
        }
    ];

    if (content) {
        return [
            ...sectionDelimiter("appendix", title),
            ...content,
        ];
    }

    return appendixContent;
};
