import { APP_SEARCH_RESULTS_PER_SECTION } from './constants';
function normalizeQuery(value) {
    return value.trim().toLowerCase();
}
function formatRelativeTime(timestamp) {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (elapsedSeconds < 60)
        return 'Just now';
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes < 60)
        return `${elapsedMinutes}m ago`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24)
        return `${elapsedHours}h ago`;
    const elapsedDays = Math.floor(elapsedHours / 24);
    if (elapsedDays < 7)
        return `${elapsedDays}d ago`;
    return `${Math.floor(elapsedDays / 7)}w ago`;
}
function getMatchScore(query, values) {
    if (!query)
        return 1;
    let bestScore = 0;
    for (const value of values) {
        const normalizedValue = value.toLowerCase();
        if (normalizedValue === query) {
            bestScore = Math.max(bestScore, 120);
            continue;
        }
        if (normalizedValue.startsWith(query)) {
            bestScore = Math.max(bestScore, 90);
            continue;
        }
        const matchIndex = normalizedValue.indexOf(query);
        if (matchIndex >= 0) {
            bestScore = Math.max(bestScore, 60 - Math.min(matchIndex, 20));
        }
    }
    return bestScore;
}
function sortByScoreAndDate(items) {
    return items.sort((left, right) => {
        if (right.score !== left.score)
            return right.score - left.score;
        return right.timestamp - left.timestamp;
    });
}
export function buildAppSearchSections({ query, documents, resources, actions, icons, labels, }) {
    const normalizedQuery = normalizeQuery(query);
    const hasQuery = normalizedQuery.length > 0;
    const actionItems = actions
        .map((action) => ({
        score: getMatchScore(normalizedQuery, [action.title, action.description, action.meta]),
        timestamp: 0,
        item: {
            id: action.id,
            kind: 'action',
            title: action.title,
            description: action.description,
            meta: action.meta,
            href: action.href,
            icon: action.icon,
        },
    }))
        .filter((entry) => !hasQuery || entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, APP_SEARCH_RESULTS_PER_SECTION)
        .map((entry) => entry.item);
    const documentItems = sortByScoreAndDate(documents
        .map((document) => ({
        score: getMatchScore(normalizedQuery, [document.title, document.path]),
        timestamp: document.updatedAt,
        item: {
            id: document.id,
            kind: 'document',
            title: document.title,
            description: document.path,
            meta: `Updated ${formatRelativeTime(document.updatedAt)}`,
            href: `/content/${document.id}`,
            icon: icons.document,
        },
    }))
        .filter((entry) => !hasQuery || entry.score > 0))
        .slice(0, APP_SEARCH_RESULTS_PER_SECTION)
        .map((entry) => entry.item);
    const resourceItems = sortByScoreAndDate(resources
        .map((resource) => ({
        score: getMatchScore(normalizedQuery, [resource.name, resource.path, resource.mimeType]),
        timestamp: resource.lastModified,
        item: {
            id: resource.id,
            kind: 'resource',
            title: resource.name,
            description: resource.path,
            meta: `${resource.categoryLabel} / ${resource.mimeType || 'File'} / Imported ${formatRelativeTime(resource.importedAt)}`,
            href: resource.href,
            icon: resource.icon || icons.resource,
        },
    }))
        .filter((entry) => !hasQuery || entry.score > 0))
        .slice(0, APP_SEARCH_RESULTS_PER_SECTION)
        .map((entry) => entry.item);
    const sections = [
        {
            id: 'actions',
            title: labels.actions.title,
            items: actionItems,
        },
        {
            id: 'documents',
            title: labels.documents.title,
            items: documentItems,
        },
        {
            id: 'resources',
            title: labels.resources.title,
            items: resourceItems,
        },
    ];
    return sections.filter((section) => section.items.length > 0 || !hasQuery);
}
