export type OcrSourceKind = 'url' | 'base64';

export interface OcrAgentInput {
	source: string;
	sourceKind: OcrSourceKind;
	mimeType: string;
	providerId: string;
	apiKey: string;
	modelName: string;
	language?: string;
	prompt?: string;
}

export interface OcrPage {
	index: number;
	text: string;
}

export interface OcrAgentOutput {
	text: string;
	pages: OcrPage[];
	model: string;
}
