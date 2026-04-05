import type { Document } from '@langchain/core/documents';
import type { EmbeddingsInterface } from '@langchain/core/embeddings';
import type {
	DocumentIndexSnapshot,
	IndexedDocumentRecord,
} from '../../rag/document-index-store';
import type { WorkspaceService } from '../../workspace/workspace-service';
import { DocumentIndexStore, VectorStore } from '../../rag';

const DEFAULT_TOP_K = 4;
const DEFAULT_FETCH_K_MULTIPLIER = 3;
const DEFAULT_MAX_DISTANCE = 0.85;
const DEFAULT_CONTEXT_WINDOW = 1;
const MIN_CHUNK_OVERLAP = 40;

export interface RagRetrieverOptions {
	workspaceService: WorkspaceService;
	embeddings: EmbeddingsInterface;
	topK?: number;
	maxDistance?: number;
	contextWindow?: number;
	fetchK?: number;
}

export interface RetrievedDocument {
	pageContent: string;
	metadata: Record<string, unknown>;
	score: number;
}

interface RetrievalCandidate extends RetrievedDocument {
	record?: IndexedDocumentRecord;
	recordKey?: string;
	chunkIndex?: number;
}

interface IndexedWindow {
	record: IndexedDocumentRecord;
	recordKey: string;
	chunkStart: number;
	chunkEnd: number;
	score: number;
	metadata: Record<string, unknown>;
	matchedChunkIndices: number[];
}

export class RagRetriever {
	private store: VectorStore | null = null;
	private documentIndex: DocumentIndexSnapshot | null = null;
	private readonly recordsByFileId = new Map<string, IndexedDocumentRecord>();
	private readonly recordsBySource = new Map<string, IndexedDocumentRecord>();
	private readonly recordsByFileName = new Map<string, IndexedDocumentRecord>();
	private loaded = false;

	constructor(private readonly options: RagRetrieverOptions) {}

	async retrieve(query: string): Promise<RetrievedDocument[]> {
		return this.retrieveMany([query]);
	}

	async retrieveMany(queries: string[]): Promise<RetrievedDocument[]> {
		if (!this.loaded) {
			await this.loadResources();
		}

		if (this.store === null || this.store.size === 0) {
			return [];
		}

		const normalizedQueries = normalizeQueries(queries);
		if (normalizedQueries.length === 0) {
			return [];
		}

		const topK = this.options.topK ?? DEFAULT_TOP_K;
		const fetchK = Math.max(
			topK,
			this.options.fetchK ?? topK * DEFAULT_FETCH_K_MULTIPLIER
		);
		const maxDistance = this.options.maxDistance ?? DEFAULT_MAX_DISTANCE;
		const candidates = await this.collectCandidates(normalizedQueries, fetchK, maxDistance);
		if (candidates.length === 0) {
			return [];
		}

		const contextWindow = this.options.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
		const expandedWindows = this.expandCandidates(candidates, contextWindow);

		return expandedWindows
			.map((window) => this.materializeWindow(window))
			.sort(compareRetrievedDocuments)
			.slice(0, topK);
	}

	private async collectCandidates(
		queries: string[],
		fetchK: number,
		maxDistance: number
	): Promise<RetrievalCandidate[]> {
		if (this.store === null) {
			return [];
		}

		const candidates = new Map<string, RetrievalCandidate>();

		for (const query of queries) {
			const results = await this.store.similaritySearchWithScore(query, fetchK);
			for (const [document, score] of results) {
				if (!Number.isFinite(score) || score > maxDistance) {
					continue;
				}

				const candidate = this.toCandidate(document, score);
				const candidateKey = this.getCandidateKey(candidate);
				const existing = candidates.get(candidateKey);

				if (!existing || candidate.score < existing.score) {
					candidates.set(candidateKey, candidate);
				}
			}
		}

		return Array.from(candidates.values()).sort(compareRetrievedDocuments);
	}

	private expandCandidates(
		candidates: RetrievalCandidate[],
		contextWindow: number
	): Array<IndexedWindow | RetrievedDocument> {
		const expanded: Array<IndexedWindow | RetrievedDocument> = [];

		for (const candidate of candidates) {
			const window = this.toIndexedWindow(candidate, contextWindow);
			if (!window) {
				if (!expanded.some((entry) => !isIndexedWindow(entry) && sameRawDocument(entry, candidate))) {
					expanded.push(candidate);
				}
				continue;
			}

			const existing = expanded.find(
				(entry) =>
					isIndexedWindow(entry) &&
					entry.recordKey === window.recordKey &&
					rangesOverlapOrTouch(entry.chunkStart, entry.chunkEnd, window.chunkStart, window.chunkEnd)
			);

			if (existing && isIndexedWindow(existing)) {
				existing.chunkStart = Math.min(existing.chunkStart, window.chunkStart);
				existing.chunkEnd = Math.max(existing.chunkEnd, window.chunkEnd);
				existing.score = Math.min(existing.score, window.score);
				existing.matchedChunkIndices = uniqueNumbers([
					...existing.matchedChunkIndices,
					...window.matchedChunkIndices,
				]);
				continue;
			}

			expanded.push(window);
		}

		return expanded;
	}

	private materializeWindow(window: IndexedWindow | RetrievedDocument): RetrievedDocument {
		if (!isIndexedWindow(window)) {
			return window;
		}

		const chunks = window.record.chunks
			.slice(window.chunkStart, window.chunkEnd + 1)
			.map((chunk) => chunk.pageContent.trim())
			.filter(Boolean);

		return {
			pageContent: stitchChunkContents(chunks),
			metadata: {
				...window.metadata,
				fileId: window.record.fileId,
				fileName: window.record.fileName,
				source: window.record.source,
				chunkStart: window.chunkStart,
				chunkEnd: window.chunkEnd,
				matchedChunkIndices: window.matchedChunkIndices,
			},
			score: window.score,
		};
	}

	private toCandidate(document: Document, score: number): RetrievalCandidate {
		const metadata = document.metadata as Record<string, unknown>;
		const chunkIndex = readChunkIndex(metadata);
		const record = this.findIndexedRecord(metadata);
		const recordKey = record ? getRecordKey(record) : undefined;

		return {
			pageContent: document.pageContent,
			metadata,
			score,
			record,
			recordKey,
			chunkIndex,
		};
	}

	private toIndexedWindow(
		candidate: RetrievalCandidate,
		contextWindow: number
	): IndexedWindow | undefined {
		if (!candidate.record || candidate.recordKey === undefined || candidate.chunkIndex === undefined) {
			return undefined;
		}

		const chunkStart = Math.max(0, candidate.chunkIndex - contextWindow);
		const chunkEnd = Math.min(candidate.record.chunkCount - 1, candidate.chunkIndex + contextWindow);

		return {
			record: candidate.record,
			recordKey: candidate.recordKey,
			chunkStart,
			chunkEnd,
			score: candidate.score,
			metadata: candidate.metadata,
			matchedChunkIndices: [candidate.chunkIndex],
		};
	}

	private getCandidateKey(candidate: RetrievalCandidate): string {
		if (candidate.recordKey !== undefined && candidate.chunkIndex !== undefined) {
			return `${candidate.recordKey}:${candidate.chunkIndex}`;
		}

		const metadataKey = readSourceKey(candidate.metadata);
		if (metadataKey) {
			return `${metadataKey}:${candidate.pageContent}`;
		}

		return candidate.pageContent;
	}

	private findIndexedRecord(metadata: Record<string, unknown>): IndexedDocumentRecord | undefined {
		const fileId = readString(metadata['fileId']);
		if (fileId && this.recordsByFileId.has(fileId)) {
			return this.recordsByFileId.get(fileId);
		}

		const source = readString(metadata['source']);
		if (source && this.recordsBySource.has(source)) {
			return this.recordsBySource.get(source);
		}

		const fileName = readString(metadata['fileName']);
		if (fileName && this.recordsByFileName.has(fileName)) {
			return this.recordsByFileName.get(fileName);
		}

		return undefined;
	}

	private async loadResources(): Promise<void> {
		this.loaded = true;
		this.recordsByFileId.clear();
		this.recordsBySource.clear();
		this.recordsByFileName.clear();

		try {
			const vectorStorePath = this.options.workspaceService.getVectorStorePath();
			if (!vectorStorePath) {
				this.store = null;
				this.documentIndex = null;
				return;
			}

			this.store = await VectorStore.load(vectorStorePath, this.options.embeddings);

			const documentIndexPath = this.options.workspaceService.getDocumentIndexPath();
			this.documentIndex = documentIndexPath
				? await DocumentIndexStore.load(documentIndexPath)
				: null;

			for (const document of this.documentIndex?.documents ?? []) {
				if (document.fileId) {
					this.recordsByFileId.set(document.fileId, document);
				}
				if (document.source) {
					this.recordsBySource.set(document.source, document);
				}
				if (document.fileName) {
					this.recordsByFileName.set(document.fileName, document);
				}
			}
		} catch {
			this.store = null;
			this.documentIndex = null;
			this.recordsByFileId.clear();
			this.recordsBySource.clear();
			this.recordsByFileName.clear();
		}
	}
}

function isIndexedWindow(value: IndexedWindow | RetrievedDocument): value is IndexedWindow {
	return 'record' in value;
}

function compareRetrievedDocuments(a: RetrievedDocument, b: RetrievedDocument): number {
	return a.score - b.score;
}

function rangesOverlapOrTouch(
	startA: number,
	endA: number,
	startB: number,
	endB: number
): boolean {
	return startA <= endB + 1 && startB <= endA + 1;
}

function sameRawDocument(a: RetrievedDocument, b: RetrievedDocument): boolean {
	const aSource = readSourceKey(a.metadata);
	const bSource = readSourceKey(b.metadata);

	if (aSource && bSource) {
		return aSource === bSource && a.pageContent === b.pageContent;
	}

	return a.pageContent === b.pageContent;
}

function normalizeQueries(queries: string[]): string[] {
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const query of queries) {
		const cleaned = query.replace(/\s+/g, ' ').trim();
		if (cleaned.length === 0) {
			continue;
		}

		const cacheKey = cleaned.toLowerCase();
		if (seen.has(cacheKey)) {
			continue;
		}

		seen.add(cacheKey);
		normalized.push(cleaned);
	}

	return normalized;
}

function readChunkIndex(metadata: Record<string, unknown>): number | undefined {
	const value = metadata['chunkIndex'];

	if (typeof value === 'number' && Number.isInteger(value)) {
		return value;
	}

	if (typeof value === 'string' && /^\d+$/.test(value)) {
		return Number(value);
	}

	return undefined;
}

function readString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const cleaned = value.trim();
	return cleaned.length > 0 ? cleaned : undefined;
}

function readSourceKey(metadata: Record<string, unknown>): string | undefined {
	return readString(metadata['source']) ?? readString(metadata['fileName']) ?? readString(metadata['fileId']);
}

function getRecordKey(record: IndexedDocumentRecord): string {
	return record.fileId || record.source || record.fileName;
}

function stitchChunkContents(chunks: string[]): string {
	let stitched = '';

	for (const chunk of chunks) {
		if (!stitched) {
			stitched = chunk;
			continue;
		}

		const overlapLength = findBoundaryOverlap(stitched, chunk);
		if (overlapLength > 0) {
			stitched += chunk.slice(overlapLength);
			continue;
		}

		stitched += `\n\n${chunk}`;
	}

	return stitched.trim();
}

function findBoundaryOverlap(left: string, right: string): number {
	const maxOverlap = Math.min(left.length, right.length);

	for (let overlap = maxOverlap; overlap >= MIN_CHUNK_OVERLAP; overlap -= 1) {
		if (left.slice(-overlap) === right.slice(0, overlap)) {
			return overlap;
		}
	}

	return 0;
}

function uniqueNumbers(values: number[]): number[] {
	return Array.from(new Set(values)).sort((a, b) => a - b);
}
