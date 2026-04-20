import { constants } from "node:fs";
import { access as fsAccess, readFile as fsReadFile, writeFile as fsWriteFile } from "node:fs/promises";
import { type Static, Type } from "@sinclair/typebox";
import type { AgentTool } from "../lib/agent/index.js";
import {
	applyEditsToNormalizedContent,
	detectLineEnding,
	type Edit,
	generateDiffString,
	normalizeToLF,
	restoreLineEndings,
	stripBom,
} from "./edit-diff.js";
import { withFileMutationQueue } from "./file-mutation-queue.js";
import { resolveToCwd } from "./path-utils.js";

const replaceEditSchema = Type.Object(
	{
		oldText: Type.String({
			description:
				"Exact text for one targeted replacement. Must be unique in the original file and must not overlap with other edits.",
		}),
		newText: Type.String({ description: "Replacement text for this targeted edit." }),
	},
	{ additionalProperties: false },
);

const editSchema = Type.Object(
	{
		path: Type.String({ description: "Path to the file to edit (relative or absolute)" }),
		edits: Type.Array(replaceEditSchema, {
			description:
				"One or more targeted replacements. Each edit matches the original file, not after prior edits. No overlapping edits.",
		}),
	},
	{ additionalProperties: false },
);

export type EditToolInput = Static<typeof editSchema>;

export interface EditToolDetails {
	diff: string;
	firstChangedLine?: number;
}

function prepareEditArguments(input: unknown): EditToolInput {
	if (!input || typeof input !== "object") return input as EditToolInput;
	const args = input as Record<string, unknown>;
	if (typeof args.edits === "string") {
		try {
			const parsed = JSON.parse(args.edits);
			if (Array.isArray(parsed)) args.edits = parsed;
		} catch {}
	}
	const legacy = args as EditToolInput & { oldText?: unknown; newText?: unknown };
	if (typeof legacy.oldText === "string" && typeof legacy.newText === "string") {
		const edits = Array.isArray(legacy.edits) ? [...legacy.edits] : [];
		edits.push({ oldText: legacy.oldText, newText: legacy.newText });
		const { oldText: _o, newText: _n, ...rest } = legacy;
		return { ...rest, edits } as EditToolInput;
	}
	return args as EditToolInput;
}

export function createEditTool(cwd: string): AgentTool<typeof editSchema, EditToolDetails | undefined> {
	return {
		name: "edit",
		label: "edit",
		description:
			"Edit a single file using exact text replacement. Every edits[].oldText must match a unique, non-overlapping region of the original file.",
		parameters: editSchema,
		executionMode: "sequential",
		prepareArguments: prepareEditArguments,
		async execute(_id, input, signal) {
			if (signal?.aborted) throw new Error("Operation aborted");
			if (!Array.isArray(input.edits) || input.edits.length === 0) {
				throw new Error("edits must contain at least one replacement.");
			}
			const { path, edits } = { path: input.path, edits: input.edits as Edit[] };
			const abs = resolveToCwd(path, cwd);

			return withFileMutationQueue(abs, async () => {
				try {
					await fsAccess(abs, constants.R_OK | constants.W_OK);
				} catch {
					throw new Error(`File not found: ${path}`);
				}
				const buffer = await fsReadFile(abs);
				const rawContent = buffer.toString("utf-8");
				const { bom, text: content } = stripBom(rawContent);
				const originalEnding = detectLineEnding(content);
				const normalized = normalizeToLF(content);
				const { baseContent, newContent } = applyEditsToNormalizedContent(normalized, edits, path);
				const final = bom + restoreLineEndings(newContent, originalEnding);
				await fsWriteFile(abs, final, "utf-8");
				const diffResult = generateDiffString(baseContent, newContent);
				return {
					content: [{ type: "text", text: `Successfully replaced ${edits.length} block(s) in ${path}.` }],
					details: { diff: diffResult.diff, firstChangedLine: diffResult.firstChangedLine } as any,
				};
			});
		},
	};
}

export const editTool = createEditTool(process.cwd());
