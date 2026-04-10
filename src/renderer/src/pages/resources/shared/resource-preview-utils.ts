export const MIME_PREFIX_IMAGE = 'image/';
export const MIME_TYPE_PDF = 'application/pdf';
export const MIME_TYPE_JSON = 'application/json';

export const MIME_TO_LANGUAGE: Record<string, string> = {
	'application/json': 'json',
	'application/xml': 'xml',
	'text/css': 'css',
	'text/javascript': 'javascript',
	'text/typescript': 'typescript',
	'text/jsx': 'javascript',
	'text/tsx': 'typescript',
	'text/x-python': 'python',
};

export const BINARY_MIME_TYPES = new Set([
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/msword',
	'application/rtf',
]);

export function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let current = '';
	let inQuotes = false;
	let row: string[] = [];

	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		if (inQuotes) {
			if (char === '"' && text[i + 1] === '"') {
				current += '"';
				i += 1;
			} else if (char === '"') {
				inQuotes = false;
			} else {
				current += char;
			}
		} else if (char === '"') {
			inQuotes = true;
		} else if (char === ',') {
			row.push(current);
			current = '';
		} else if (char === '\n' || (char === '\r' && text[i + 1] === '\n')) {
			row.push(current);
			current = '';
			rows.push(row);
			row = [];
			if (char === '\r') i += 1;
		} else {
			current += char;
		}
	}

	if (current || row.length > 0) {
		row.push(current);
		rows.push(row);
	}

	return rows;
}
