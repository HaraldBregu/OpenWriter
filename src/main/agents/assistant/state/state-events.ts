export type StateEventKind =
	| 'status'
	| 'step:begin'
	| 'step:end'
	| 'image'
	| 'text'
	| 'tool'
	| 'decision'
	| 'decision:invalid'
	| 'usage'
	| 'budget'
	| 'skill:selected';

export interface StateEvent {
	kind: StateEventKind;
	at: number;
	payload: unknown;
}
