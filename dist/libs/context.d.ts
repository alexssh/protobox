/**
 * Declarative context creation for Protobox apps.
 * Generates Provider and hook with full typing, optional Immer integration.
 */
import { type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { Draft } from 'immer';
export interface CreateProtoContextOptions<T> {
    name: string;
    initialState: T;
    useImmer?: boolean;
}
export interface ProtoContextValue<T> {
    state: T;
    setState: Dispatch<SetStateAction<T>>;
    update: (fn: (draft: T | Draft<T>) => void) => void;
}
export declare function createProtoContext<T>(options: CreateProtoContextOptions<T>): {
    Provider: (props: {
        children: ReactNode;
    }) => import("react/jsx-runtime").JSX.Element;
    useValue: () => ProtoContextValue<T>;
};
