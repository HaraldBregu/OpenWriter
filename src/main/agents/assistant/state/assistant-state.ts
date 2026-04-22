import type { AssistantToolCallRecord, AssistantUsageTotals } from '../types';
import type { StateEvent } from './state-events';

export type AssistantStatus = 'pending' | 'running' | 'done' | 'error' | 'aborted';

export type StepNodeName = 'controller' | 'text' | 'image' | 'skill';

export type StepStatus = 'running' | 'done' | 'error' | 'skipped';

export interface ImageRecord {
	relativePath: string;
	prompt: string;
}

export interface StepRecord {
	index: number;
	node: StepNodeName;
	action?: string;
	status: StepStatus;
	data?: unknown;
	error?: string;
	startedAt: number;
	completedAt?: number;
}

export type ControllerAction = 'text' | 'image' | 'skill' | 'done';

export interface ControllerDecision {
	action: ControllerAction;
	instruction?: string;
	imagePrompt?: string;
	skillName?: string;
	toolsAllowlist?: readonly string[];
	reason?: string;
}

export interface UsageRecord {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	elapsedMs: number;
}

export interface BudgetRecord {
	kind: 'tokens' | 'time';
	usedTokens?: number;
	elapsedMs?: number;
}

export interface SkillSelectionRecord {
	skillName: string;
	instruction?: string;
}

export interface AssistantSnapshot {
	status: AssistantStatus;
	steps: StepRecord[];
	images: ImageRecord[];
	textSegments: string[];
	toolCalls: AssistantToolCallRecord[];
	decisions: ControllerDecision[];
	iterations: number;
	usage: AssistantUsageTotals;
	skillsSelected: SkillSelectionRecord[];
}

export type StateListener = (event: StateEvent) => void;

const DEFAULT_ITERATION_BUMP = 1;

export class AssistantState {
	private _status: AssistantStatus = 'pending';
	private readonly _steps: StepRecord[] = [];
	private readonly _images: ImageRecord[] = [];
	private readonly _textSegments: string[] = [];
	private readonly _toolCalls: AssistantToolCallRecord[] = [];
	private readonly _decisions: ControllerDecision[] = [];
	private readonly _skillsSelected: SkillSelectionRecord[] = [];
	private _iterations = 0;
	private _stepCounter = 0;
	private _usageInput = 0;
	private _usageOutput = 0;
	private _currentSegment = '';
	private readonly _listeners = new Set<StateListener>();

	subscribe(listener: StateListener): () => void {
		this._listeners.add(listener);
		return () => {
			this._listeners.delete(listener);
		};
	}

	get status(): AssistantStatus {
		return this._status;
	}

	get steps(): readonly StepRecord[] {
		return this._steps;
	}

	get images(): readonly ImageRecord[] {
		return this._images;
	}

	get textSegments(): readonly string[] {
		return this._textSegments;
	}

	get toolCalls(): readonly AssistantToolCallRecord[] {
		return this._toolCalls;
	}

	get decisions(): readonly ControllerDecision[] {
		return this._decisions;
	}

	get iterations(): number {
		return this._iterations;
	}

	get usage(): AssistantUsageTotals {
		return {
			inputTokens: this._usageInput,
			outputTokens: this._usageOutput,
			totalTokens: this._usageInput + this._usageOutput,
		};
	}

	get skillsSelected(): readonly SkillSelectionRecord[] {
		return this._skillsSelected;
	}

	get lastImage(): ImageRecord | undefined {
		return this._images[this._images.length - 1];
	}

	get lastTextSegment(): string | undefined {
		return this._textSegments[this._textSegments.length - 1];
	}

	get finalText(): string {
		return this._textSegments.join('\n\n');
	}

	setStatus(status: AssistantStatus): void {
		this._status = status;
		this.emit({ kind: 'status', at: Date.now(), payload: { status } });
	}

	beginStep(node: StepNodeName, action?: string): StepRecord {
		this._stepCounter += 1;
		const step: StepRecord = {
			index: this._stepCounter,
			node,
			action,
			status: 'running',
			startedAt: Date.now(),
		};
		this._steps.push(step);
		this.emit({ kind: 'step:begin', at: step.startedAt, payload: { ...step } });
		return step;
	}

	completeStep(step: StepRecord, data?: unknown): void {
		step.status = 'done';
		step.data = data;
		step.completedAt = Date.now();
		this.emit({ kind: 'step:end', at: step.completedAt, payload: { ...step } });
	}

	skipStep(step: StepRecord, data?: unknown): void {
		step.status = 'skipped';
		step.data = data;
		step.completedAt = Date.now();
		this.emit({ kind: 'step:end', at: step.completedAt, payload: { ...step } });
	}

	failStep(step: StepRecord, error: string): void {
		step.status = 'error';
		step.error = error;
		step.completedAt = Date.now();
		this.emit({ kind: 'step:end', at: step.completedAt, payload: { ...step } });
	}

	recordDecision(decision: ControllerDecision): void {
		this._decisions.push(decision);
		this.emit({ kind: 'decision', at: Date.now(), payload: { ...decision } });
	}

	recordInvalidDecision(raw: string, error: string): void {
		this.emit({ kind: 'decision:invalid', at: Date.now(), payload: { raw, error } });
	}

	recordUsage(record: UsageRecord): void {
		this._usageInput += record.inputTokens;
		this._usageOutput += record.outputTokens;
		this.emit({ kind: 'usage', at: Date.now(), payload: { ...record } });
	}

	recordBudget(record: BudgetRecord): void {
		this.emit({ kind: 'budget', at: Date.now(), payload: { ...record } });
	}

	recordSkillSelection(record: SkillSelectionRecord): void {
		this._skillsSelected.push(record);
		this.emit({ kind: 'skill:selected', at: Date.now(), payload: { ...record } });
	}

	addImage(image: ImageRecord): void {
		this._images.push(image);
		this.emit({ kind: 'image', at: Date.now(), payload: { ...image } });
	}

	appendText(text: string): void {
		this._textSegments.push(text);
		this.emit({ kind: 'text', at: Date.now(), payload: { text } });
	}

	addToolCall(record: AssistantToolCallRecord): void {
		this._toolCalls.push(record);
		this.emit({ kind: 'tool', at: Date.now(), payload: { ...record } });
	}

	bumpIterations(amount: number = DEFAULT_ITERATION_BUMP): void {
		this._iterations += amount;
	}

	snapshot(): AssistantSnapshot {
		return {
			status: this._status,
			steps: this._steps.map((s) => ({ ...s })),
			images: this._images.map((i) => ({ ...i })),
			textSegments: [...this._textSegments],
			toolCalls: this._toolCalls.map((t) => ({ ...t })),
			decisions: this._decisions.map((d) => ({ ...d })),
			iterations: this._iterations,
			usage: this.usage,
			skillsSelected: this._skillsSelected.map((s) => ({ ...s })),
		};
	}

	private emit(event: StateEvent): void {
		for (const listener of this._listeners) {
			listener(event);
		}
	}
}
