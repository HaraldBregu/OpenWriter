export async function buildSystemPrompt(
  memory: MemoryManager,
  channel?: string,
  chat_id?: string,
): Promise<string> {
  const now = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const parts = [
    "You are a personal AI assistant.",
    `Current date/time: ${now}`,
    `Workspace: ${memory.workspace}`,
    `Always use absolute paths when reading or writing files. Your workspace is ${memory.workspace}.`,
  ];
  if (channel) parts.push(`Channel: ${channel}`);
  if (chat_id) parts.push(`Chat ID: ${chat_id}`);

  const sections = [parts.join("\n")];
  const all = await memory.readAll();
  for (const [tag, content] of Object.entries(all)) {
    sections.push(`<${tag}>\n${content}\n</${tag}>`);
  }
  return sections.join("\n\n");
}

import OpenAI from "openai";
import chalk from "chalk";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import type { Tool } from "../main/assistant/tools/base.js";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";

export const MODEL = "gpt-5.4";
const MAX_ITERATIONS = 20;

marked.use(markedTerminal() as any);

export const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
});

function fmtArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${chalk.dim(`${k}=`)}${chalk.white(String(v).slice(0, 60))}`)
    .join("  ");
}

function panel(title: string, body: string, color: "green" | "red"): string {
  const c = color === "green" ? chalk.green : chalk.red;
  const line = c("─".repeat(60));
  return `${c("┌─")} ${chalk.bold(c(title))} ${line}\n${body}\n${c("└")}${line}`;
}

export interface RunResult {
  text: string;
  newMessages: ChatCompletionMessageParam[];
}

export async function runAgent(
  userMessage: string,
  tools: Tool[],
  history: ChatCompletionMessageParam[] = [],
  systemPrompt?: string,
): Promise<RunResult> {
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const toolSchemas = tools.map((t) => t.schema() as ChatCompletionTool);

  const messages: ChatCompletionMessageParam[] = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push(...history);
  if (userMessage) messages.push({ role: "user", content: userMessage });

  const newMessages: ChatCompletionMessageParam[] = [];
  if (userMessage) newMessages.push({ role: "user", content: userMessage });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: toolSchemas.length ? toolSchemas : undefined,
    });

    const msg = response.choices[0].message;

    const assistantMsg: ChatCompletionMessageParam = {
      role: "assistant",
      content: msg.content ?? "",
    };
    if (msg.tool_calls && msg.tool_calls.length) {
      (assistantMsg as any).tool_calls = msg.tool_calls.map((tc: ChatCompletionMessageToolCall) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));
    }

    messages.push(assistantMsg);
    newMessages.push(assistantMsg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const text = msg.content ?? "";
      const rendered = (await marked.parse(text)).toString().trimEnd();
      console.log(panel("assistant", rendered, "green"));
      return { text, newMessages };
    }

    for (const tc of msg.tool_calls) {
      const fnName = tc.function.name;
      let fnArgs: Record<string, unknown> = {};
      try {
        fnArgs = JSON.parse(tc.function.arguments);
      } catch {
        fnArgs = {};
      }

      console.log(`  ${chalk.bold.magenta(`⚡ ${fnName}`)}  ${fmtArgs(fnArgs)}`);

      const tool = toolMap.get(fnName);
      const result = tool ? await tool.execute(fnArgs) : `Error: unknown tool '${fnName}'`;

      const preview = result.length > 50 ? result.slice(0, 50) + "..." : result;
      console.log(`  ${chalk.green("✓")} ${chalk.dim(preview)}\n`);

      const toolResultMsg: ChatCompletionMessageParam = {
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      };
      messages.push(toolResultMsg);
      newMessages.push(toolResultMsg);
    }
  }

  const error = "Error: max iterations reached";
  console.log(panel("error", error, "red"));
  return { text: error, newMessages };
}

import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const WORKSPACE = path.join(os.homedir(), ".ai-assistant", "workspace");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dist/agent/memory.js → dist/agent → repo root → workspace-templates
const TEMPLATES = path.resolve(__dirname, "..", "..", "workspace-templates");

export class MemoryManager {
  workspace: string = WORKSPACE;

  async init(): Promise<void> {
    await fs.mkdir(this.workspace, { recursive: true });
    await this.seedTemplates();
  }

  private async seedTemplates(): Promise<void> {
    let entries: string[];
    try {
      entries = await fs.readdir(TEMPLATES);
    } catch {
      return;
    }
    const isFresh = !(await this.exists(path.join(this.workspace, "SOUL.md")));
    for (const filename of entries) {
      if (filename === "BOOTSTRAP.md" && !isFresh) continue;
      const dest = path.join(this.workspace, filename);
      if (!(await this.exists(dest))) {
        await fs.copyFile(path.join(TEMPLATES, filename), dest);
      }
    }
  }

  private async exists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  async readAll(): Promise<Record<string, string>> {
    const files = ["AGENTS.md", "BOOTSTRAP.md", "MEMORY.md", "SOUL.md", "USER.md"];
    const result: Record<string, string> = {};
    for (const filename of files) {
      const p = path.join(this.workspace, filename);
      try {
        const content = (await fs.readFile(p, "utf8")).trim();
        if (content) {
          const key = path.parse(filename).name.toLowerCase();
          result[key] = content;
        }
      } catch {
        // missing file — skip
      }
    }
    return result;
  }
}
