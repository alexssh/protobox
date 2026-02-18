declare global {
    interface Window {
        __PBOX_PARAMS__?: Record<string, unknown>;
    }
}
/** Hook for Protobox app params. Uses window.__PBOX_PARAMS__ as initial state, updates from postMessage. */
export declare function useProtoParams(): Record<string, unknown>;
