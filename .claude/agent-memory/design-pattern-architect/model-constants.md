---
name: model-constants design
description: Architecture design for src/shared/model-constants.ts — the single source of truth for AI provider/model metadata
type: project
---

# Shared Model Constants Catalogue Design

**Why:** Model metadata (capabilities, base URLs, image generation config) is currently scattered
across 5 files, with PROVIDER_BASE_URLS defined twice. A single shared catalogue eliminates all
duplication and makes reasoning-model detection authoritative rather than heuristic.

**Pattern:** Typed Catalog (NOT a class-based Registry — data is compile-time static, no runtime
registration needed). Pure query functions over frozen constants.

**File:** `src/shared/model-constants.ts`

**Import path convention:** Relative paths only (same as aiSettings.ts). NO new @shared/ alias.
- From main: `../../shared/model-constants`
- From renderer: `../../../../shared/model-constants`

## Type Hierarchy (summary)

- `InferenceCapabilities` — reasoning, vision, streaming booleans
- `GenerationCapabilities` — imageGeneration, embeddings booleans
- `ModelCapabilities` — { inference: InferenceCapabilities, generation: GenerationCapabilities }
- `ImageGenerationConfig` — defaultSize, defaultQuality, maxImagesPerRequest, outputFormat
- `ModelDescriptor` — id, name, description, contextWindow, capabilities, imageGenerationConfig?
- `ProviderDescriptor` — id, name, baseUrl (string | undefined), models: readonly ModelDescriptor[]
- `ProviderId` — derived union type from catalogue

## Primary Exports

- `PROVIDER_CATALOGUE: readonly ProviderDescriptor[]` — ordered array, insertion order preserved for UI
- `PROVIDER_MAP: Readonly<Record<string, ProviderDescriptor>>` — O(1) lookup derived from catalogue
- Query functions (all pure, no side effects):
  - `isReasoningModel(modelId)` — catalogue lookup first, prefix fallback for unknown IDs
  - `getProviderBaseUrl(providerId)` — replaces duplicate PROVIDER_BASE_URLS in chat/embedding factories
  - `requiresNoTemperature(modelId)` — consumed by chat-model-factory
  - `getProvider(providerId)` → ProviderDescriptor | undefined
  - `getModel(providerId, modelId)` → ModelDescriptor | undefined
  - `getModelsWithCapability(predicate)` → Array<{provider, model}>
  - `getImageGenerationConfig(modelId)` → ImageGenerationConfig | undefined
  - `isKnownProvider(providerId)` → boolean
  - `getProvidersForDisplay(filter?)` → readonly ProviderDescriptor[]

## What Gets Consolidated

| From | What moves |
|---|---|
| src/renderer/src/config/ai-providers.ts | All AIProvider + ModelOption data (file becomes shim or deleted) |
| src/main/shared/ai-utils.ts | REASONING_MODEL_PREFIXES constant |
| src/main/shared/chat-model-factory.ts | PROVIDER_BASE_URLS constant |
| src/main/shared/embedding-factory.ts | PROVIDER_BASE_URLS constant (duplicate) |
| src/main/ai/agents/image_generator/generate-image-node.ts | IMAGE_MODEL, IMAGE_SIZE, IMAGE_QUALITY constants |

## What Does NOT Move

- InferenceSettings, AgentConfig — runtime data shapes, stay in aiSettings.ts
- AGENT_DEFINITIONS, AGENT_IDS — agent metadata, not model metadata, stay in aiSettings.ts
- extractTokenFromChunk, classifyError — LangChain/runtime concerns, stay in ai-utils.ts
- createChatModel, createEmbeddingModel — require LangChain imports, stay in their factories

## Special Notes

- gpt-image-1 is a model entry under OpenAI provider, not a separate provider
- o1-mini and o1-preview should be included as deprecated entries (reasoning: true) to handle
  legacy persisted settings, even though they are not shown in the UI dropdown
- isReasoningModel must retain prefix-match fallback for unknown model IDs not in catalogue
- ModelDescriptor is a strict superset of ModelOption — backwards compatible with existing UI code

## Migration Order (incremental, each step shippable)

1. Create model-constants.ts
2. Update chat-model-factory.ts (getProviderBaseUrl)
3. Update embedding-factory.ts (getProviderBaseUrl)
4. Update generate-image-node.ts (getImageGenerationConfig)
5. Update ai-utils.ts (remove REASONING_MODEL_PREFIXES, rewrite isReasoningModel as wrapper)
6. Update ModelsSettingsPage.tsx (import from model-constants directly)
7. Delete or shim ai-providers.ts

**How to apply:** When implementing model-constants.ts or any file that references it, follow
the type hierarchy and function signatures exactly as designed. The migration is intentionally
incremental — do not attempt all 7 steps in one PR.
