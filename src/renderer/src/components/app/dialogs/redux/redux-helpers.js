export function entryCount(value) {
    if (Array.isArray(value))
        return `${value.length} items`;
    if (value && typeof value === 'object')
        return `${Object.keys(value).length} keys`;
    return typeof value;
}
