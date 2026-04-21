# Agent Task Handler — Design

## Goal
Preprocess the user prompt to select at most one skill from the skills store, then inject its instructions into the assistant loop so controller + text nodes behave per the selected skill.

## Components

### `AgentTaskHandlerNode` (new)
`src/main/agents/assistant/nodes/agent-task-handler-node.ts`

- Builds `FileSystemSkillRepository` with `input.skillsDir` (required absolute path).
- Lists skills. If empty → returns `null` (no-op, observe as `skipped` step).
- Calls LLM (OpenAI SDK via `createOpenAIClient`) with:
  - System prompt: "Pick at most one skill from the catalog that matches the user request. Reply strict JSON `{"skillName": "..."|null, "reason": "..."}`. Never add prose."
  - User prompt: `buildSkillsPrompt(skills)` + `User request: <prompt>`.
- Parses JSON via `extractJsonObject`. If `skillName` missing or not in registry → no skill.
- Records `task-handler` step with chosen skill name or `null`.
- Returns `Skill | null`.

### Wiring in `AssistantAgent.run`
1. Construct `NodeContext`.
2. `const selectedSkill = await new AgentTaskHandlerNode().select(nodeCtx);`
3. Mutate `nodeCtx` to include `selectedSkill`.
4. Enter existing controller loop.

### Context extension
`NodeContext` adds `selectedSkill?: Skill`.

### Skill injection
Both `ControllerNode` and `TextNode` check `ctx.selectedSkill`. If set, append
`\n\n${renderSkillInstructions(skill)}` to their existing system prompt.
No behavioral change when unset.

### State changes
`StepNodeName` gains `'task-handler'`. No new step status.
Step records: `action = skill name selected | 'none'`.

### Input extension
`AssistantAgentInput.skillsDir?: string`. Optional absolute path. If missing, handler skips (no store → no skills).

## Error handling
- Skill repo load throws → `step.failStep`, swallowed; loop proceeds.
- LLM call throws non-abort → log via state, skip skill selection.
- Abort signal → propagates.
- Invalid JSON / unknown skill name → null, skip.

## Non-goals
- No per-step re-selection (one-shot).
- No multi-skill composition.
- No renderer/IPC changes.

## Files touched
- `src/main/agents/assistant/nodes/agent-task-handler-node.ts` (new)
- `src/main/agents/assistant/nodes/node.ts` (add `selectedSkill`)
- `src/main/agents/assistant/nodes/index.ts` (export)
- `src/main/agents/assistant/nodes/controller-node.ts` (inject skill)
- `src/main/agents/assistant/nodes/text-node.ts` (inject skill)
- `src/main/agents/assistant/state/assistant-state.ts` (extend `StepNodeName`)
- `src/main/agents/assistant/state/index.ts` (re-export if needed)
- `src/main/agents/assistant/assistant-agent.ts` (invoke handler)
- `src/main/agents/assistant/types.ts` (+ `skillsDir?`)

## Testing plan
- Run with empty skills dir → no skill step logged as skipped (or done with null), main loop unchanged.
- Run with a matching skill present → `task-handler` step records name; downstream controller + text prompts include skill instructions; final `content.md` reflects skill guidance.
- Run with skills but none relevant → null selection, no injection.
