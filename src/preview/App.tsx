import React, { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'pbox-selected-app'

interface AppMeta {
  appName: string
  title: string
  description?: string
  parameters?: ParameterMeta[]
}

interface ParameterMeta {
  type: string
  key: string
  label?: string
  default?: unknown
  options?: Array<{ value: string; label: string }>
}

export default function App() {
  const [apps, setApps] = useState<AppMeta[]>([])
  const [selected, setSelected] = useState<string>('')
  const [params, setParams] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const sendParams = useCallback(() => {
    const w = iframeRef.current?.contentWindow
    if (w) w.postMessage({ type: 'pbox-params', params }, '*')
  }, [params])

  const fetchApps = useCallback((): Promise<AppMeta[]> => {
    return fetch('/api/apps')
      .then((r) => r.json())
      .then((data: AppMeta[]) => {
        setApps(data)
        return data
      })
  }, [])

  useEffect(() => {
    fetchApps()
      .then((data) => {
        const saved = localStorage.getItem(STORAGE_KEY)
        const validApp = data.find((a) => a.appName === saved)
        if (validApp) {
          setSelected(saved!)
          setParams(extractDefaults(validApp))
        } else if (data.length > 0) {
          setSelected(data[0].appName)
          setParams(extractDefaults(data[0]))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [fetchApps])

  useEffect(() => {
    if (selected) localStorage.setItem(STORAGE_KEY, selected)
  }, [selected])

  useEffect(() => {
    sendParams()
  }, [sendParams])

  useEffect(() => {
    const es = new EventSource('/api/events')
    es.onmessage = (e) => {
      if (e.data === 'reload') {
        fetchApps()
        setReloadKey((k) => k + 1)
      }
    }
    return () => es.close()
  }, [fetchApps])

  if (loading) return <div className="pbox-loading">Loading apps...</div>
  if (apps.length === 0) return <div className="pbox-empty">No apps in build/. Run pbox build.</div>

  const currentApp = apps.find((a) => a.appName === selected)

  return (
    <div className="pbox-preview">
      <header className="pbox-header">
        <h1>Protobox Preview</h1>
        <select
          value={selected}
          onChange={(e) => {
            const app = apps.find((a) => a.appName === e.target.value)
            setSelected(e.target.value)
            if (app) setParams(extractDefaults(app))
          }}
        >
          {apps.map((a) => (
            <option key={a.appName} value={a.appName}>
              {a.title || a.appName}
            </option>
          ))}
        </select>
      </header>
      <aside className="pbox-params">
        {currentApp?.parameters?.map((p) => (
          <ParamControl
            key={p.key}
            param={p}
            value={params[p.key]}
            onChange={(v) => setParams((prev) => ({ ...prev, [p.key]: v }))}
          />
        ))}
        {(!currentApp?.parameters || currentApp.parameters.length === 0) && <p className="pbox-no-params">No parameters</p>}
      </aside>
      <main className="pbox-main">
        <iframe
          ref={iframeRef}
          id="app-frame"
          key={`${selected}-${reloadKey}`}
          src={`/apps/${selected}/index.html?v=${reloadKey}`}
          title={currentApp?.title}
          className="pbox-iframe"
          onLoad={sendParams}
        />
      </main>
    </div>
  )
}

function extractDefaults(app: AppMeta): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const p of app.parameters ?? []) {
    out[p.key] = p.default
  }
  return out
}

function ParamControl({ param, value, onChange }: { param: ParameterMeta; value: unknown; onChange: (v: unknown) => void }) {
  const label = param.label ?? param.key

  if (param.type === 'boolean') {
    return (
      <label className="pbox-param">
        <span>{label}</span>
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
      </label>
    )
  }

  if (param.type === 'number') {
    return (
      <label className="pbox-param">
        <span>{label}</span>
        <input
          type="number"
          value={(value as number) ?? param.default ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </label>
    )
  }

  if (param.type === 'string') {
    return (
      <label className="pbox-param">
        <span>{label}</span>
        <input type="text" value={(value as string) ?? param.default ?? ''} onChange={(e) => onChange(e.target.value)} />
      </label>
    )
  }

  if (param.type === 'option') {
    const opts = param.options ?? []
    return (
      <label className="pbox-param">
        <span>{label}</span>
        <select value={(value as string) ?? param.default ?? ''} onChange={(e) => onChange(e.target.value)}>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label ?? o.value}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (param.type === 'option-multi') {
    const opts = param.options ?? []
    const arr = (Array.isArray(value) ? value : []) as string[]
    return (
      <label className="pbox-param pbox-param-multi">
        <span>{label}</span>
        <div>
          {opts.map((o) => (
            <label key={o.value}>
              <input
                type="checkbox"
                checked={arr.includes(o.value)}
                onChange={(e) => {
                  const next = e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value)
                  onChange(next)
                }}
              />
              {o.label ?? o.value}
            </label>
          ))}
        </div>
      </label>
    )
  }

  return null
}
