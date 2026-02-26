import React, { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY_APP = 'pbox-selected-app'
const STORAGE_KEY_PARAMS = 'pbox-params'

function loadParamsForApp(appName: string, app: AppMeta): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARAMS)
    if (!raw) return extractDefaults(app)
    const all = JSON.parse(raw) as Record<string, Record<string, unknown>>
    const saved = all[appName]
    if (!saved) return extractDefaults(app)
    const defaults = extractDefaults(app)
    return { ...defaults, ...saved }
  } catch {
    return extractDefaults(app)
  }
}

function saveParamsForApp(appName: string, params: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARAMS)
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, unknown>>) : {}
    all[appName] = params
    localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(all))
  } catch {}
}

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
  const [uiHidden, setUiHidden] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const uiHiddenRef = useRef(uiHidden)
  uiHiddenRef.current = uiHidden

  const doShow = useCallback(() => setUiHidden(false), [])
  const doHide = useCallback(() => setUiHidden(true), [])

  const toggleUi = useCallback(() => {
    if (uiHiddenRef.current) doShow()
    else doHide()
  }, [doShow, doHide])

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
        const savedApp = localStorage.getItem(STORAGE_KEY_APP)
        const validApp = data.find((a) => a.appName === savedApp)
        if (validApp) {
          setSelected(savedApp!)
          setParams(loadParamsForApp(savedApp!, validApp))
        } else if (data.length > 0) {
          setSelected(data[0].appName)
          setParams(loadParamsForApp(data[0].appName, data[0]))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [fetchApps])

  useEffect(() => {
    if (selected) localStorage.setItem(STORAGE_KEY_APP, selected)
  }, [selected])

  useEffect(() => {
    if (selected) saveParamsForApp(selected, params)
  }, [selected, params])

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '.') {
        e.preventDefault()
        toggleUi()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [toggleUi])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'pbox-toggle-ui') toggleUi()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [toggleUi])


  if (loading) return <div className="pbox-loading">Loading apps...</div>
  if (apps.length === 0) return <div className="pbox-empty">No apps in build/. Run pbox build.</div>

  const currentApp = apps.find((a) => a.appName === selected)

  return (
    <div className={`pbox-preview${uiHidden ? ' pbox-preview_ui-hidden' : ''}`}>
      {!uiHidden && (
        <header className="pbox-header">
          <h1>Protobox Preview</h1>
          <select
          value={selected}
          onChange={(e) => {
            const appName = e.target.value
            const app = apps.find((a) => a.appName === appName)
            setSelected(appName)
            if (app) setParams(loadParamsForApp(appName, app))
          }}
        >
          {apps.map((a) => (
            <option key={a.appName} value={a.appName}>
              {a.title || a.appName}
            </option>
          ))}
        </select>
          <button type="button" className="pbox-hide-btn" onClick={doHide} title="Hide UI (Cmd+.)" aria-label="Hide UI">
            Hide UI
          </button>
        </header>
      )}
      {!uiHidden && (
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
      )}
      {uiHidden && (
        <button type="button" className="pbox-float-btn" onClick={doShow} title="Show UI (Cmd+.)" aria-label="Show UI">
          Show UI
        </button>
      )}
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
