import { sampleItems } from '@/static'

export interface DemoViewData {
  count: number
  label: string
  items: Array<{ id: string; label: string; value: number }>
  onIncrement: () => void
}

export const defaultData: DemoViewData = {
  count: 0,
  label: 'Protobox',
  items: sampleItems,
  onIncrement: () => {},
}

type UseAppContext = () => {
  state: { count: number; label: string }
  setState: React.Dispatch<React.SetStateAction<{ count: number; label: string }>>
}

export function useDemoViewData(useAppContext: UseAppContext): DemoViewData {
  const { state, setState } = useAppContext()
  return {
    ...defaultData,
    count: state.count,
    label: state.label,
    onIncrement: () => setState((s) => ({ ...s, count: s.count + 1 })),
  }
}
