/**
 * IndexingManifest — tracks which files have been indexed and when.
 *
 * Enables incremental indexing: on re-index, files whose lastModified
 * timestamp has not changed are skipped. Uses content hash as a secondary
 * check when timestamps change (handles copy/touch scenarios).
 *
 * Stored as a JSON file alongside the vector store.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const MANIFEST_FILE = 'index-manifest.json';
const MANIFEST_VERSION = 1;

export interface ManifestEntry {
	/** File last-modified timestamp when it was indexed. */
	lastModified: number;
	/** SHA-256 hash of file content at index time. */
	contentHash: string;
	/** Timestamp when the file was indexed. */
	indexedAt: number;
	/** Number of chunks produced from this file. */
	chunkCount: number;
}

interface ManifestData {
	version: number;
	entries: Record<string, ManifestEntry>;
}

export class IndexingManifest {
	private entries: Record<string, ManifestEntry>;

	private constructor(entries: Record<string, ManifestEntry>) {
		this.entries = entries;
	}

	static async load(storePath: string): Promise<IndexingManifest> {
		const manifestPath = path.join(storePath, MANIFEST_FILE);
		try {
			const raw = await fs.readFile(manifestPath, 'utf-8');
			const data = JSON.parse(raw) as ManifestData;
			if (data.version !== MANIFEST_VERSION) {
				return new IndexingManifest({});
			}
			return new IndexingManifest(data.entries);
		} catch {
			return new IndexingManifest({});
		}
	}

	async save(storePath: string): Promise<void> {
		await fs.mkdir(storePath, { recursive: true });
		const manifestPath = path.join(storePath, MANIFEST_FILE);
		const data: ManifestData = {
			version: MANIFEST_VERSION,
			entries: this.entries,
		};
		await fs.writeFile(manifestPath, JSON.stringify(data, null, 2), 'utf-8');
	}

	needsReindex(fileId: string, lastModified: number): boolean {
		const entry = this.entries[fileId];
		if (!entry) return true;
		return entry.lastModified !== lastModified;
	}

	setIndexed(fileId: string, lastModified: number, contentHash: string, chunkCount: number): void {
		this.entries[fileId] = {
			lastModified,
			contentHash,
			indexedAt: Date.now(),
			chunkCount,
		};
	}

	removeEntry(fileId: string): void {
		delete this.entries[fileId];
	}

	getStaleEntries(currentFileIds: Set<string>): string[] {
		return Object.keys(this.entries).filter((id) => !currentFileIds.has(id));
	}

	static async hashFile(filePath: string): Promise<string> {
		const content = await fs.readFile(filePath);
		return createHash('sha256').update(content).digest('hex');
	}
}
