export function formatDuration(ms) {
    if (!ms)
        return '—';
    if (ms < 1000)
        return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}
export function formatEventTime(receivedAt) {
    return new Date(receivedAt).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}
export async function submitDemoTask(variant) {
    await window.task.submit({
        type: 'demo',
        input: { variant },
        metadata: {},
    });
}
