import React from 'react'

import './DemoView.scss'

import { Card } from '@/components/Card/v1/Card'

import { sampleItems } from '@/data'

interface DemoViewProps {
  useAppContext: () => { state: { count: number; label: string }; setState: React.Dispatch<React.SetStateAction<{ count: number; label: string }>> }
}

export function DemoView({ useAppContext }: DemoViewProps) {
  const { state, setState } = useAppContext()

  return (
    <div className="demo-view">
      <Card title="Context + data">
        <p>Count: {state.count}</p>
        <button type="button" className="demo-view__btn" onClick={() => setState((s) => ({ ...s, count: s.count + 1 }))}>
          Increment
        </button>
        <p>Label: {state.label}</p>
        <ul className="demo-view__list">
          {sampleItems.map((item) => (
            <li key={item.id}>
              {item.label}: {item.value}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
