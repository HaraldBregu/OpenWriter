/**
 * ragLoader.ts — Indexing phase of the RAG pipeline.
 *
 * Uses only @langchain/core and @langchain/openai (already installed).
 * Replaces the monolithic `langchain` package with lightweight inline equivalents:
 *   - TextLoader      → fs.readFileSync
 *   - TextSplitter    → splitText()
 *   - MemoryVectorStore → SimpleRetriever (cosine-similarity over OpenAI embeddings)
 */

import path from 'node:path'
import fs from 'node:fs'
import { OpenAIEmbeddings } from '@langchain/openai'
import { BaseRetriever } from '@langchain/core/retrievers'
import { Document } from '@langchain/core/documents'
import type { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IndexOptions {
  /** Absolute path to the file to index. Supports .txt and .md. */
  filePath: string
  /** OpenAI API key used for embeddings. */
  apiKey: string
  /** Max characters per chunk (default: 1000). */
  chunkSize?: number
  /** Overlap between adjacent chunks in characters (default: 200). */
  chunkOverlap?: number
  /** Number of chunks returned per query (default: 4). */
  topK?: number
}

export interface IndexResult {
  retriever: BaseRetriever
  chunkCount: number
  filePath: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cosine similarity between two equal-length vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10)
}

/**
 * Splits text into overlapping chunks.
 * Tries to break on paragraph / newline / sentence / word boundaries.
 */
function splitText(text: string, chunkSize: number, chunkOverlap: number): string[] {
  const separators = ['\n\n', '\n', '. ', ' ', '']
  const chunks: string[] = []

  function split(s: string, sepIdx: number): void {
    if (s.length <= chunkSize) {
      if (s.trim()) chunks.push(s.trim())
      return
    }
    const sep = separators[sepIdx]
    if (sep === '') {
      // Hard-cut fallback
      for (let i = 0; i < s.length; i += chunkSize - chunkOverlap) {
        chunks.push(s.slice(i, i + chunkSize).trim())
        if (i + chunkSize >= s.length) break
      }
      return
    }
    const parts = s.split(sep).filter(Boolean)
    let current = ''
    for (const part of parts) {
      const candidate = current ? current + sep + part : part
      if (candidate.length <= chunkSize) {
        current = candidate
      } else {
        if (current) {
          if (current.length <= chunkSize) {
            chunks.push(current.trim())
          } else {
            split(current, sepIdx + 1)
          }
          current = part
        } else {
          split(part, sepIdx + 1)
        }
      }
    }
    if (current.trim()) {
      if (current.length <= chunkSize) {
        chunks.push(current.trim())
      } else {
        split(current, sepIdx + 1)
      }
    }
  }

  split(text, 0)

  // Add overlap by stitching adjacent chunks
  if (chunkOverlap > 0 && chunks.length > 1) {
    const overlapped: string[] = [chunks[0]]
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1]
      const tail = prev.slice(-chunkOverlap)
      overlapped.push((tail + ' ' + chunks[i]).trim())
    }
    return overlapped
  }

  return chunks
}

// ---------------------------------------------------------------------------
// Custom in-memory retriever
// ---------------------------------------------------------------------------

/**
 * SimpleRetriever keeps document embeddings in memory and performs
 * cosine-similarity search to retrieve the top-k most relevant chunks.
 *
 * Implements BaseRetriever so it's a first-class Runnable in LCEL chains.
 */
class SimpleRetriever extends BaseRetriever {
  lc_namespace = ['rag', 'simple_retriever']

  private readonly docs: Document[]
  private readonly vectors: number[][]
  private readonly k: number
  private readonly embedder: OpenAIEmbeddings

  constructor(docs: Document[], vectors: number[][], k: number, embedder: OpenAIEmbeddings) {
    super()
    this.docs = docs
    this.vectors = vectors
    this.k = k
    this.embedder = embedder
  }

  async _getRelevantDocuments(
    query: string,
    _runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    const queryVec = await this.embedder.embedQuery(query)

    const scored = this.vectors.map((vec, i) => ({
      score: cosineSimilarity(queryVec, vec),
      doc: this.docs[i]
    }))

    scored.sort((a, b) => b.score - a.score)

    return scored.slice(0, this.k).map((s) => s.doc)
  }
}

// ---------------------------------------------------------------------------
// Core indexing function
// ---------------------------------------------------------------------------

export async function indexFile(options: IndexOptions): Promise<IndexResult> {
  const {
    filePath,
    apiKey,
    chunkSize = 1000,
    chunkOverlap = 200,
    topK = 4
  } = options

  const resolved = path.resolve(filePath)

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`)
  }

  console.log(`[RAG] Indexing file: ${resolved}`)

  // --- Step 1: Load document ---
  const rawText = fs.readFileSync(resolved, 'utf8')
  console.log(`[RAG] Loaded file (${rawText.length} chars)`)

  // --- Step 2: Split into chunks ---
  const chunkTexts = splitText(rawText, chunkSize, chunkOverlap)
  const chunks: Document[] = chunkTexts.map((text, i) =>
    new Document({
      pageContent: text,
      metadata: { source: resolved, chunkIndex: i }
    })
  )
  console.log(`[RAG] Split into ${chunks.length} chunks (size=${chunkSize}, overlap=${chunkOverlap})`)

  // --- Step 3: Embed all chunks ---
  const embedder = new OpenAIEmbeddings({
    apiKey,
    model: 'text-embedding-3-small'
  })

  const vectors = await embedder.embedDocuments(chunkTexts)
  console.log(`[RAG] Embedded ${vectors.length} chunks`)

  // --- Step 4: Build retriever ---
  const retriever = new SimpleRetriever(chunks, vectors, topK, embedder)

  return {
    retriever,
    chunkCount: chunks.length,
    filePath: resolved
  }
}
