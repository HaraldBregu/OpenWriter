import Heading from '@tiptap/extension-heading';


const h1: ElementAttribute = {
    fontSize: '18pt',
    fontWeight: 'bold',
    color: null,
    fontStyle: 'normal',
    fontFamily: 'Times New Roman',
    textAlign: 'left',
    marginLeft: '0px',
    marginRight: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    lineHeight: '1',
}

const h2: ElementAttribute = {
    fontSize: '16pt',
    fontWeight: 'bold',
    color: null,
    fontStyle: 'normal',
    fontFamily: 'Times New Roman',
    textAlign: 'left',
    marginLeft: '0px',
    marginRight: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    lineHeight: '1',
}

const h3: ElementAttribute = {
    fontSize: '14pt',
    fontWeight: 'bold',
    color: null,
    fontStyle: 'normal',
    fontFamily: 'Times New Roman',
    textAlign: 'left',
    marginLeft: '0px',
    marginRight: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    lineHeight: '1',
}

const h4: ElementAttribute = {
    fontSize: '12pt',
    fontWeight: 'bold',
    color: null,
    fontStyle: 'italic',
    fontFamily: 'Times New Roman',
    textAlign: 'left',
    marginLeft: '0px',
    marginRight: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    lineHeight: '1',
}

const h5: ElementAttribute = {
    fontSize: '12pt',
    fontWeight: 'bold',
    color: null,
    fontStyle: 'italic',
    fontFamily: 'Times New Roman',
    textAlign: 'left',
    marginLeft: '0px',
    marginRight: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    lineHeight: '1',
}

const h6: ElementAttribute = {
    fontSize: '10pt',
    fontWeight: 'bold',
    color: null,
    fontStyle: 'italic',
    fontFamily: 'Times New Roman',
    textAlign: 'left',
    marginLeft: '0px',
    marginRight: '0px',
    marginTop: '0px',
    marginBottom: '0px',
    lineHeight: '1',
}

// Define heading styles for each level
const headingStyles: Record<number, ElementAttribute> = {
    1: h1,
    2: h2,
    3: h3,
    4: h4,
    5: h5,
    6: h6,
};

export const ExtendedHeading = Heading
    .configure({
        levels: [1, 2, 3, 4, 5, 6],
    })
    .extend({
        addAttributes() {
            return {
                level: {
                    default: 1,
                    rendered: true,
                    // Aggiungiamo un trigger per aggiornare gli altri attributi quando cambia il livello
                    parseHTML: element => {
                        const level = parseInt(element.tagName.replace('H', ''), 10);
                        return level || 1;
                    }
                },
                fontSize: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => {
                        const style = element.getAttribute('style');
                        if (style) {
                            const match = style.match(/font-size:\s*([^;]+)/);
                            return match ? match[1].trim() : null;
                        }
                        return element.dataset.fontSize || null;
                    },
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const fontSize = attributes.fontSize || headingStyles[level].fontSize;
                        return { style: `font-size: ${fontSize}` };
                    },
                },
                fontWeight: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.fontWeight || element.dataset.fontWeight || 'bold',
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const weight = attributes.fontWeight || headingStyles[level].fontWeight;
                        return { style: `font-weight: ${weight}` };
                    },
                },
                fontStyle: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.fontStyle || element.dataset.fontStyle || null,
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const style = attributes.fontStyle || headingStyles[level].fontStyle;
                        if (style === 'normal') return {};
                        return { style: `font-style: ${style}` };
                    },
                },
                color: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.color || element.dataset.color || '#000',
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const color = attributes.color || headingStyles[level].color;
                        return { style: `color: ${color}` };
                    },
                },
                fontFamily: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.fontFamily || element.dataset.fontFamily || 'Times New Roman',
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const fontFamily = attributes.fontFamily || headingStyles[level].fontFamily;
                        return { style: `font-family: ${fontFamily}` };
                    },
                },
                textAlign: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.textAlign || element.dataset.textAlign || 'left',
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const textAlign = attributes.textAlign || headingStyles[level].textAlign;
                        return { style: `text-align: ${textAlign}` };
                    },
                },
                marginLeft: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.marginLeft || element.dataset.marginLeft || '0px',
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const marginLeft = attributes.marginLeft || headingStyles[level].marginLeft;
                        return { style: `margin-left: ${marginLeft}` };
                    },
                },
                marginRight: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.marginRight || element.dataset.marginRight || '0px',
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const marginRight = attributes.marginRight || headingStyles[level].marginRight;
                        return { style: `margin-right: ${marginRight}` };
                    },
                },
                marginTop: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.marginTop || element.dataset.marginTop || '0px',
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const marginTop = attributes.marginTop || headingStyles[level].marginTop;
                        return { style: `margin-top: ${marginTop}` };
                    },
                },
                marginBottom: {
                    default: null, // Rimosso valore di default statico
                    parseHTML: element => element.style.marginBottom || element.dataset.marginBottom || '0px',
                    renderHTML: attributes => {
                        const level = attributes.level || 1;
                        const marginBottom = attributes.marginBottom || headingStyles[level].marginBottom;
                        return { style: `margin-bottom: ${marginBottom}` };
                    },
                },
            };
        },

        onTransaction({ transaction }) {
            // Quando c'è una transazione che cambia il livello, aggiorniamo gli attributi
            const docChanged = transaction.docChanged;
            if (!docChanged) return;

            const { state } = this.editor.view;
            const { tr } = state;
            let modified = false;

            // Itera attraverso tutti i nodi del documento per trovare gli heading
            state.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
                    const level = node.attrs.level;
                    const style = headingStyles[level];

                    // Se gli attributi non corrispondono agli stili predefiniti per questo livello, aggiornali
                    if (node.attrs.fontSize !== style.fontSize ||
                        node.attrs.fontWeight !== style.fontWeight ||
                        node.attrs.fontStyle !== style.fontStyle ||
                        node.attrs.color !== style.color ||
                        node.attrs.fontFamily !== style.fontFamily) {

                        tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            fontSize: style.fontSize,
                            fontWeight: style.fontWeight,
                            fontStyle: style.fontStyle,
                            color: style.color,
                            fontFamily: style.fontFamily
                        });
                        modified = true;
                    }
                }
                return true;
            });

            if (modified) {
                this.editor.view.dispatch(tr);
            }
        },

        addCommands() {
            return {
                ...this.parent?.(),
                setHeading: attributes => ({ chain }) => {
                    const level = attributes.level;
                    const styles = headingStyles[level];

                    return chain().setNode('heading', {
                        level,
                        fontSize: styles.fontSize,
                        fontWeight: styles.fontWeight,
                        fontStyle: styles.fontStyle,
                        color: styles.color,
                        fontFamily: styles.fontFamily
                    }).run();
                }
            }
        },

        renderHTML({ node, HTMLAttributes }) {
            const level = node.attrs.level;
            const styles = headingStyles[level];

            const fontSize = node.attrs.fontSize || styles.fontSize;
            const fontWeight = node.attrs.fontWeight || styles.fontWeight;
            const fontStyle = node.attrs.fontStyle || (level >= 4 ? 'italic' : 'normal');
            const color = node.attrs.color || styles.color;
            const fontFamily = node.attrs.fontFamily || styles.fontFamily;
            const textAlign = node.attrs.textAlign || styles.textAlign;

            const marginTop = `${node.attrs.marginTop}px` || styles.marginTop;
            const marginBottom = `${node.attrs.marginBottom}px` || styles.marginBottom;
            const marginLeft = `${(node.attrs.indent * 40)}px` || styles.marginLeft;
            const marginRight = node.attrs.marginRight || styles.marginRight;
            const lineHeight = node.attrs.lineHeight || styles.lineHeight;

            const styleString = `font-size: ${fontSize}; 
            font-weight: ${fontWeight}; 
            color: ${color}; 
            ${fontStyle === 'italic' ? 'font-style: italic' : ''}; 
            font-family: ${fontFamily}; 
            text-align: ${textAlign}; 
            margin-left: ${marginLeft}; margin-right: ${marginRight};
            margin-top: ${marginTop}; margin-bottom: ${marginBottom};
            line-height: ${lineHeight};`;

            return [`h${level}`, {
                ...HTMLAttributes,
                class: `heading-${level}`,
                style: styleString,
                "data-font-size": fontSize,
                "data-font-weight": fontWeight,
                "data-color": color,
                "data-font-style": fontStyle,
                "data-font-family": fontFamily,

            }, 0];
        }
    });
