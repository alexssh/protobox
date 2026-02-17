import { useState, useEffect } from 'react'

declare global {
  interface Window {
    __PROTO_PARAMS__?: Record<string, unknown>
  }
}

/** Hook for Proto app params. Uses window.__PROTO_PARAMS__ as initial state, updates from postMessage. */
export function useProtoParams(): Record<string, unknown> {
  const [params, setParams] = useState<Record<string, unknown>>(() => {
    if (typeof window === 'undefined') return {}
    return window.__PROTO_PARAMS__ ?? {}
  })

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'proto-params' && e.data.params) {
        setParams(e.data.params as Record<string, unknown>)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return params
}
