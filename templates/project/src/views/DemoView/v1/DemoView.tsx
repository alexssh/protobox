import React from 'react'
import { bem } from 'protobox/bem'

import './DemoView.scss'

import { Card } from '@/components/Card/v1/Card'

import { defaultData, type DemoViewData } from './DemoViewData'

const b = bem.bind(null, 'Demo-view')

interface DemoViewProps {
  data?: DemoViewData
}

export function DemoView({ data = defaultData }: DemoViewProps) {
  return (
    <div className={b()}>
      <Card title="Context + data">
        <p>Count: {data.count}</p>
        <button type="button" className={b('btn')} onClick={data.onIncrement}>
          Increment
        </button>
        <p>Label: {data.label}</p>
        <ul className={b('list')}>
          {data.items.map((item) => (
            <li key={item.id}>
              {item.label}: {item.value}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
