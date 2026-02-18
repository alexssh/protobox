import { chartData } from '@/static'

export interface ChartViewData {
  count: number
  label: string
  chartData: Array<{ x: string; y: number }>
  onAdd: () => void
}

export const defaultData: ChartViewData = {
  count: 0,
  label: 'Protobox',
  chartData,
  onAdd: () => {},
}

type UseAppContext = () => {
  state: { count: number; label: string }
  update: (fn: (d: { count: number }) => void) => void
}

export function useChartViewData(useAppContext: UseAppContext): ChartViewData {
  const { state, update } = useAppContext()
  return {
    ...defaultData,
    count: state.count,
    label: state.label,
    onAdd: () => update((draft) => { draft.count += 1 }),
  }
}
