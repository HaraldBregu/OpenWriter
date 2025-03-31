const createTocTreeStructure = (jsonText) => {
    try {
        const jsonData = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;

        if (!jsonData.content || !Array.isArray(jsonData.content)) {
            console.error("Formato JSON non valido: manca il campo 'content' o non è un array");
            return [];
        }

        const headings = jsonData.content.filter(item =>
            item.type === 'heading' &&
            item.content &&
            item.content.length > 0
        );

        const extractText = (contentArray) => {
            if (!contentArray || !Array.isArray(contentArray)) return "Senza nome";

            return contentArray.map(item => item.text || "").join(" ").trim() || "Senza nome";
        };

        const orderedHeadings = [...headings].sort((a, b) => {
            return jsonData.content.indexOf(a) - jsonData.content.indexOf(b);
        });

        const lastHeadingByLevel = {};
        const result = [];
        let counter = 1;

        const generateId = (level, parentId = null) => {
            if (level === 1) {
                return String(counter++);
            } else if (parentId) {
                const childCount = (lastHeadingByLevel[level - 1]?.children?.length || 0) + 1;
                return `${parentId}.${childCount}`;
            }
            return String(counter++);
        };

        orderedHeadings.forEach(heading => {
            const level = heading.attrs.level;
            const name = extractText(heading.content);

            let parent = null;
            if (level > 1) {
                for (let parentLevel = level - 1; parentLevel >= 1; parentLevel--) {
                    if (lastHeadingByLevel[parentLevel]) {
                        parent = lastHeadingByLevel[parentLevel];
                        break;
                    }
                }
            }

            const newHeading = {
                id: generateId(level, parent?.id),
                name,
                children: []
            };

            if (level === 1) {
                result.push(newHeading);
            } else if (parent) {
                parent.children.push(newHeading);
            } else {
                console.warn(`Heading di livello ${level} senza un genitore valido: "${name}"`);
                result.push(newHeading);
            }

            lastHeadingByLevel[level] = newHeading;

            for (let deeperLevel = level + 1; deeperLevel <= 6; deeperLevel++) {
                delete lastHeadingByLevel[deeperLevel];
            }
        });

        return result;
    } catch (error) {
        console.error("Errore nella creazione della struttura TOC:", error);
        return [];
    }
};

export default createTocTreeStructure;