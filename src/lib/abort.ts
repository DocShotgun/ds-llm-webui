export var serverAbortController = new AbortController();

export async function resetAbort() {
    serverAbortController = new AbortController();
}