import React from 'react'
import { bem } from 'protobox/bem'

import './ChartView.scss'

import { Card } from '@/components/Card/v2/Card'

import { defaultData, type ChartViewData } from './ChartViewData'

const b = bem.bind(null, 'Chart-view')

interface ChartViewProps {
  data?: ChartViewData
}

export function ChartView({ data = defaultData }: ChartViewProps) {
  return (
    <div className={b()}>
      <Card title="Context + update() + data">
        <p>
          Shared state: count={data.count}, label=&quot;{data.label}&quot;
        </p>
        <button type="button" className={b('btn')} onClick={data.onAdd}>
          Add
        </button>
        <ul className={b('data')}>
          {data.chartData.map((d, i) => (
            <li key={i}>
              {d.x}: {d.y}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
