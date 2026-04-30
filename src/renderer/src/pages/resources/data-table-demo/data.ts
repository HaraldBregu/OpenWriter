export type Payment = {
	id: string;
	amount: number;
	status: 'pending' | 'processing' | 'success' | 'failed';
	email: string;
};

export const payments: Payment[] = [
	{ id: 'm5gr84i9', amount: 316, status: 'success', email: 'ken99@example.com' },
	{ id: '3u1reuv4', amount: 242, status: 'success', email: 'abe45@example.com' },
	{ id: 'derv1ws0', amount: 837, status: 'processing', email: 'monserrat44@example.com' },
	{ id: '5kma53ae', amount: 874, status: 'success', email: 'silas22@example.com' },
	{ id: 'bhqecj4p', amount: 721, status: 'failed', email: 'carmella@example.com' },
	{ id: 'a1b2c3d4', amount: 102, status: 'pending', email: 'lila.png@example.com' },
	{ id: 'e5f6g7h8', amount: 489, status: 'success', email: 'noah.k@example.com' },
	{ id: 'i9j0k1l2', amount: 56, status: 'failed', email: 'mae.q@example.com' },
	{ id: 'm3n4o5p6', amount: 933, status: 'processing', email: 'orion.t@example.com' },
	{ id: 'q7r8s9t0', amount: 215, status: 'success', email: 'pixel@example.com' },
	{ id: 'u1v2w3x4', amount: 670, status: 'pending', email: 'quill@example.com' },
	{ id: 'y5z6a7b8', amount: 388, status: 'success', email: 'rune@example.com' },
	{ id: 'c9d0e1f2', amount: 144, status: 'failed', email: 'salt@example.com' },
	{ id: 'g3h4i5j6', amount: 901, status: 'processing', email: 'tide@example.com' },
	{ id: 'k7l8m9n0', amount: 27, status: 'success', email: 'umbra@example.com' },
	{ id: 'o1p2q3r4', amount: 555, status: 'pending', email: 'vesper@example.com' },
	{ id: 's5t6u7v8', amount: 612, status: 'success', email: 'wisp@example.com' },
	{ id: 'w9x0y1z2', amount: 73, status: 'failed', email: 'xeno@example.com' },
	{ id: 'a3b4c5d6', amount: 444, status: 'processing', email: 'yarrow@example.com' },
	{ id: 'e7f8g9h0', amount: 88, status: 'success', email: 'zephyr@example.com' },
	{ id: 'i1j2k3l4', amount: 730, status: 'pending', email: 'amber@example.com' },
	{ id: 'm5n6o7p8', amount: 199, status: 'success', email: 'basil@example.com' },
];
