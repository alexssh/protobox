/**
 * Declarative context creation for Protobox apps.
 * Generates Provider and hook with full typing, optional Immer integration.
 */

import { createContext, useContext, useCallback, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import type { Draft } from 'immer'

export interface CreateProtoContextOptions<T> {
  name: string
  initialState: T
  useImmer?: boolean
}

export interface ProtoContextValue<T> {
  state: T
  setState: Dispatch<SetStateAction<T>>
  update: (fn: (draft: T | Draft<T>) => void) => void
}

export function createProtoContext<T>(options: CreateProtoContextOptions<T>) {
  const { name, initialState, useImmer = false } = options
  const Ctx = createContext<ProtoContextValue<T> | null>(null)

  function useValue(): ProtoContextValue<T> {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error(`${name} must be used within its Provider`)
    return ctx
  }

  function Provider(props: { children: ReactNode }) {
    const [state, setState] = useState<T>(initialState)
    const update = useCallback(
      (fn: (draft: T | Draft<T>) => void) => {
        if (useImmer) {
          import('immer').then(({ produce }) => {
            setState((prev) => produce(prev, fn as (draft: Draft<T>) => void))
          })
        } else {
          setState((prev) => {
            const next = typeof prev === 'object' && prev !== null ? ({ ...(prev as object) } as T) : prev
            ;(fn as (draft: T) => void)(next)
            return next
          })
        }
      },
      [useImmer],
    )
    return <Ctx.Provider value={{ state, setState, update }}>{props.children}</Ctx.Provider>
  }

  return { Provider, useValue }
}
