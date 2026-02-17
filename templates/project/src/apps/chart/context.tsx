import { createProtoContext } from 'proto/context'

interface AppState {
  count: number
  label: string
}

const { Provider, useValue } = createProtoContext<AppState>({
  name: 'ChartApp',
  initialState: { count: 0, label: 'Proto' },
})

export { Provider as AppProvider, useValue as useAppContext }
