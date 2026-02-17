import React, { useState, useEffect } from 'react'

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

  useEffect(() => {
    fetch('/api/apps')
      .then((r) => r.json())
      .then((data) => {
        setApps(data)
        if (data.length > 0) {
          setSelected(data[0].appName)
          setParams(extractDefaults(data[0]))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selected && params) {
      const iframe = document.getElementById('app-frame') as HTMLIFrameElement
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'proto-params', params }, '*')
      }
    }
  }, [selected, params])

  if (loading) return <div className="proto-loading">Loading apps...</div>
  if (apps.length === 0) return <div className="proto-empty">No apps in build/. Run proto build.</div>

  const currentApp = apps.find((a) => a.appName === selected)

  return (
    <div className="proto-preview">
      <header className="proto-header">
        <h1>Proto Preview</h1>
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
      <aside className="proto-params">
        {currentApp?.parameters?.map((p) => (
          <ParamControl
            key={p.key}
            param={p}
            value={params[p.key]}
            onChange={(v) => setParams((prev) => ({ ...prev, [p.key]: v }))}
          />
        ))}
        {(!currentApp?.parameters || currentApp.parameters.length === 0) && <p className="proto-no-params">No parameters</p>}
      </aside>
      <main className="proto-main">
        <iframe
          id="app-frame"
          key={selected}
          src={`/apps/${selected}/index.html`}
          title={currentApp?.title}
          className="proto-iframe"
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
      <label className="proto-param">
        <span>{label}</span>
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
      </label>
    )
  }

  if (param.type === 'number') {
    return (
      <label className="proto-param">
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
      <label className="proto-param">
        <span>{label}</span>
        <input type="text" value={(value as string) ?? param.default ?? ''} onChange={(e) => onChange(e.target.value)} />
      </label>
    )
  }

  if (param.type === 'paramoption' || param.type === 'option') {
    const opts = param.options ?? []
    return (
      <label className="proto-param">
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

  if (param.type === 'paramoptionmulti' || param.type === 'option-multi') {
    const opts = param.options ?? []
    const arr = (Array.isArray(value) ? value : []) as string[]
    return (
      <label className="proto-param proto-param-multi">
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
