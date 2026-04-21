export type StateEventKind =
	| 'status'
	| 'step:begin'
	| 'step:end'
	| 'image'
	| 'text'
	| 'tool'
	| 'decision';

export interface StateEvent {
	kind: StateEventKind;
	at: number;
	payload: unknown;
}
