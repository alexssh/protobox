import { createProtoContext } from 'protobox/context'

interface AppState {
  count: number
  label: string
}

const { Provider, useValue } = createProtoContext<AppState>({
  name: 'ChartApp',
  initialState: { count: 0, label: 'Protobox' },
})

export { Provider as AppProvider, useValue as useAppContext }
