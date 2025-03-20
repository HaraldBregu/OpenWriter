export function toTitleCasePreserve(text: string): string {
    const words = text.split(/\s+/);
    return words
        .map((word, index) => {
            if (word.length === 0) return word;
            const isFirst = index === 0;
            const isLast = index === words.length - 1;
            const firstChar = word[0];
            const rest = word.slice(1);
            // Se la parola è la prima o l'ultima, convertila con la prima lettera maiuscola
            if (isFirst || isLast) {
                return firstChar.toUpperCase() + rest;
            } else {
                // Personalizza la logica per "minor words" se necessario
                const minorWords = new Set(["and", "or", "but", "a", "an", "the"]);
                const isMinor = minorWords.has(word.toLowerCase());
                return isMinor ? firstChar.toLowerCase() + rest : firstChar.toUpperCase() + rest;
            }
        })
        .join(" ");
}