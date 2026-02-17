import React from 'react'

import './ChartView.scss'

import { Card } from '@/components/Card/v2/Card'

import { chartData } from '@/data'

interface ChartViewProps {
  useAppContext: () => {
    state: { count: number; label: string }
    update: (fn: (d: { count: number }) => void) => void
  }
}

export function ChartView({ useAppContext }: ChartViewProps) {
  const { state, update } = useAppContext()

  return (
    <div className="chart-view">
      <Card title="Context + update() + data">
        <p>
          Shared state: count={state.count}, label=&quot;{state.label}&quot;
        </p>
        <button
          type="button"
          className="chart-view__btn"
          onClick={() =>
            update((draft) => {
              draft.count += 1
            })
          }
        >
          Add
        </button>
        <ul className="chart-view__data">
          {chartData.map((d, i) => (
            <li key={i}>
              {d.x}: {d.y}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
