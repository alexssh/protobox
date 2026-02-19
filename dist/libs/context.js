import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Declarative context creation for Protobox apps.
 * Generates Provider and hook with full typing, optional Immer integration.
 */
import { createContext, useContext, useCallback, useState } from 'react';
export function createProtoContext(options) {
    const { name, initialState, useImmer = false } = options;
    const Ctx = createContext(null);
    function useValue() {
        const ctx = useContext(Ctx);
        if (!ctx)
            throw new Error(`${name} must be used within its Provider`);
        return ctx;
    }
    function Provider(props) {
        const [state, setState] = useState(initialState);
        const update = useCallback((fn) => {
            if (useImmer) {
                import('immer').then(({ produce }) => {
                    setState((prev) => produce(prev, fn));
                });
            }
            else {
                setState((prev) => {
                    const next = typeof prev === 'object' && prev !== null ? { ...prev } : prev;
                    fn(next);
                    return next;
                });
            }
        }, [useImmer]);
        return _jsx(Ctx.Provider, { value: { state, setState, update }, children: props.children });
    }
    return { Provider, useValue };
}
