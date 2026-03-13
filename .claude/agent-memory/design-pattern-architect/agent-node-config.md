---
name: AgentDefinition NodeConfigMap design
description: Approved design to replace ModelRole/ModelRegistry with inline NodeConfigMap on AgentDefinition
type: project
---

# NodeConfigMap — replacing ModelRole / ModelRegistry

**Decision**: Replace the two-hop `node → role → registry config` indirection with a direct `nodeModels: NodeConfigMap` field on `AgentDefinition`.

**Why:** ModelRegistry solves a cross-agent fleet management problem that doesn't exist. There is one agent, its three node roles are not shared with anything, and the role names carry no more meaning than the node names already do.

## New types (in `src/main/ai/core/definition.ts`)

```typescript
export interface NodeModelConfig {
  providerId:   string;
  modelId:      string;
  temperature?: number;
  maxTokens?:   number;
}

export type NodeConfigMap = Record<string, NodeModelConfig>;
```

Remove from AgentDefinition: `role?: ModelRole`, `nodeRoles?: NodeRoleMap`
Add to AgentDefinition: `nodeModels?: NodeConfigMap`

## Files to touch

- DELETE: `src/main/ai/registry/model-registry.ts`
- DELETE: `src/main/ai/registry/index.ts`
- SIMPLIFY: `src/main/ai/core/definition.ts` — add NodeModelConfig/NodeConfigMap, remove ModelRole imports
- SIMPLIFY: `src/main/ai/core/index.ts` — drop NodeRoleMap re-export, add NodeModelConfig/NodeConfigMap
- SIMPLIFY: `src/main/ai/index.ts` — remove ModelRegistry/ModelRole/ModelRoleConfig/CostTier/NodeRoleMap
- REWRITE: `src/main/ai/agents/writing_assistant/definition.ts` — replace NODE_ROLES with inline nodeModels
- SIMPLIFY: `src/main/task_manager/handlers/agent-task-handler.ts` — drop registry param, replace nodeRoles loop with nodeModels loop
- SIMPLIFY: `src/main/bootstrap.ts` — remove ModelRegistry instantiation and registry arg to AgentTaskHandler

## How to apply

When it's time to implement: delete the registry files first, then update definition.ts types, then ripple outward through the barrel exports, then update the handler, then the agent definition, then bootstrap.

## When to reintroduce a registry

If 5+ agents exist AND multiple agents genuinely share the same node role AND a settings UI needs to reconfigure them all at once — then a thin Map<string, NodeModelConfig> (no typed union, just strings) would be warranted.
