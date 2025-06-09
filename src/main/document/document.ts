import * as _ from 'lodash-es';
import { promises as fs } from 'fs'
import { readLastFolderPath, readRecentDocuments, storeLastFolderPath, storeRecentDocuments } from '../store';

export interface DocumentMetadata {
    title?: string;
    author?: string;
    createdAt: string;
    updatedAt: string;
}

export interface DocumentData {
    version: string;
    createdAt: string;
    updatedAt: string;
    mainText: object | null;
    apparatuses: DocumentApparatus[];
    annotations: object | null;
    template: object | null;
    metadata?: DocumentMetadata;
}

let currentMainText: object | null = null
let currentApparatuses: DocumentApparatus[] = []
let currentAnnotations: object | null = null
let currentDocument: DocumentData | null = null
let currentLayoutTemplate: object | null = null
let currentPageSetup: object | null = null
let currentSort: object | null = null
let currentStyles: object | null = null
let currentParatextual: object | null = null

/**
 * Sets the last folder path
 * @param folderPath - The folder path to set
 * @returns void
 */
export const setLastFolderPath = (folderPath: string | null): void => {
    storeLastFolderPath(folderPath)
}

/**
 * Gets the last folder path
 * @returns The last folder path
 */
export const getLastFolderPath = (): string | null => {
    return readLastFolderPath()
}

/**
 * Returns the recent documents list
 * @returns The recent documents list from the store
 */
export function getRecentDocuments(): string[] {
    return readRecentDocuments()
}

/**
 * Sets the recent documents list
 * @returns void
 */
export const setRecentDocuments = async (): Promise<void> => {
    let recentDocuments = getRecentDocuments()

    recentDocuments = await Promise.all(
        recentDocuments.map(async (filePath) => {
            try {
                await fs.access(filePath)
                return filePath
            } catch {
                return null
            }
        })
    ).then((files) => files.filter((file): file is string => file !== null))

    storeRecentDocuments(recentDocuments)
};

/**
 * Updates the recent documents list
 * @param filePath - The path to the document to update the recent documents list
 * @returns void
 */
export const updateRecentDocuments = (filePath: string): void => {
    let recentDocuments = getRecentDocuments()
    recentDocuments = recentDocuments.filter(doc => doc !== filePath);
    recentDocuments.unshift(filePath);
    recentDocuments = recentDocuments.slice(0, 10);

    storeRecentDocuments(recentDocuments)
};

/**
 * Sets the current main text
 * @param mainText - The main text to set
 * @returns void
 */
export const setCurrentMainText = (mainText: object | null): void => {
    currentMainText = mainText
}

/**
 * Gets the current critical text
 * @returns The current critical text
 */
export const getCurrentMainText = (): object | null => {
    return currentMainText
}

/**
 * Sets the current apparatus text
 * @param apparatusText - The apparatus text to set
 * @returns void
 */
export const setCurrentApparatuses = (apparatuses: DocumentApparatus[]): void => {
    currentApparatuses = apparatuses
}

/**
 * Gets the current apparatus text
 * @returns The current apparatus text
 */
export const getCurrentApparatuses = (): DocumentApparatus[] => {
    return currentApparatuses
}

/**
 * Sets the current annotations
 * @param annotations - The annotations to set
 * @returns void
 */
export const setCurrentAnnotations = (annotations: object | null): void => {
    currentAnnotations = annotations
}

/**
 * Gets the current annotations
 * @returns The current annotations
 */
export const getCurrentAnnotations = (): object | null => {
    return currentAnnotations
}

/**
 * Gets the current template
 * @returns The current template
 */
export const getCurrentTemplate = (): object | null => {
    return {
        layoutTemplate: getCurrentLayoutTemplate(),
        pageSetup: getCurrentPageSetup(),
        sort: getCurrentSort(),
        styles: getCurrentStyles(),
        paratextual: getCurrentParatextual(),
    }
}

/**
 * Sets the current document
 * @param document - The document to set
 * @returns void
 */
export const setCurrentDocument = (document: DocumentData | null): void => {
    currentDocument = document
}

/**
 * Gets the current document
 * @returns The current document
 */
export const getCurrentDocument = (): DocumentData | null => {
    return currentDocument
}

/**
 * Sets the current layout template
 * @param layoutTemplate - The layout template to set
 * @returns void
 */
export const setCurrentLayoutTemplate = (layoutTemplate: object | null): void => {
    currentLayoutTemplate = layoutTemplate
}

/**
 * Gets the current layout template
 * @returns The current layout template
 */
export const getCurrentLayoutTemplate = (): object | null => {
    return currentLayoutTemplate
}

/**
 * Sets the current page setup
 * @param pageSetup - The page setup to set
 * @returns void
 */
export const setCurrentPageSetup = (pageSetup: object | null): void => {
    currentPageSetup = pageSetup
}

/**
 * Gets the current page setup
 * @returns The current page setup
 */
export const getCurrentPageSetup = (): object | null => {
    return currentPageSetup
}

/**
 * Sets the current sort
 * @param sort - The sort to set
 * @returns void
 */
export const setCurrentSort = (sort: object | null): void => {
    currentSort = sort
}

/**
 * Gets the current sort
 * @returns The current sort
 */
export const getCurrentSort = (): object | null => {
    return currentSort
}

/**
 * Sets the current styles
 * @param styles - The styles to set
 * @returns void
 */
export const setCurrentStyles = (styles: object | null): void => {
    currentStyles = styles
}

/**
 * Gets the current styles
 * @returns The current styles
 */
export const getCurrentStyles = (): object | null => {
    return currentStyles
}

/**
 * Sets the current paratextual
 * @param paratextual - The paratextual to set
 * @returns void
 */
export const setCurrentParatextual = (paratextual: object | null): void => {
    currentParatextual = paratextual
}

/**
 * Gets the current paratextual
 * @returns The current paratextual
 */
export const getCurrentParatextual = (): object | null => {
    return currentParatextual
}

/**
 * Creates a document object
 * @param document - The document to create
 * @returns The created document object
 */
export async function createDocumentObject(document: DocumentData): Promise<object> {
    const newDocument: DocumentData = {
        ...document,
    }
    const scDocument = await _.mapKeys(newDocument, (__, key) => _.snakeCase(key));
    return scDocument;
}

/**
 * Creates a document object
 * @param object - The object to create
 * @returns The created document object
 */
export async function createDocument(object: object): Promise<DocumentData> {
    const document: DocumentData = {
        ...object,
        mainText: object['main_text'],
        apparatuses: object['apparatuses'],
        annotations: object['annotations'],
        template: object['template'],
        metadata: object['metadata'],
        version: object['version'],
        createdAt: object['created_at'],
        updatedAt: object['updated_at'],
    }

    const scDocument = await _.mapKeys(document, (__, key) => _.camelCase(key));

    return scDocument;
}
