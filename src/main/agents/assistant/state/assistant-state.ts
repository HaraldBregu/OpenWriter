import type { AssistantToolCallRecord } from '../types';
import type { StateEvent } from './state-events';

export type AssistantStatus = 'pending' | 'running' | 'done' | 'error' | 'aborted';

export type StepNodeName = 'controller' | 'text' | 'image';

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

export type ControllerAction = 'text' | 'image' | 'done';

export interface ControllerDecision {
	action: ControllerAction;
	instruction?: string;
	imagePrompt?: string;
	reason?: string;
}

export interface AssistantSnapshot {
	status: AssistantStatus;
	steps: StepRecord[];
	images: ImageRecord[];
	textSegments: string[];
	toolCalls: AssistantToolCallRecord[];
	decisions: ControllerDecision[];
	iterations: number;
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
	private _iterations = 0;
	private _stepCounter = 0;
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
		};
	}

	private emit(event: StateEvent): void {
		for (const listener of this._listeners) {
			listener(event);
		}
	}
}
