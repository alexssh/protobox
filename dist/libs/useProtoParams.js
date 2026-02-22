import { useState, useEffect } from 'react';
/** Hook for Protobox app params. Uses window.__PBOX_PARAMS__ as initial state, updates from postMessage. */
export function useProtoParams() {
    const [params, setParams] = useState(() => {
        if (typeof window === 'undefined')
            return {};
        return window.__PBOX_PARAMS__ ?? {};
    });
    useEffect(() => {
        const handler = (e) => {
            if (e.data?.type === 'pbox-params' && e.data.params) {
                setParams(e.data.params);
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);
    return params;
}
