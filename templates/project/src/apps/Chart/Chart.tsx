import React from 'react'
import { useProtoParams } from 'protobox/useProtoParams'
import { bem } from 'protobox/bem'

import './Chart.scss'

import { ChartView } from '@/views/ChartView/v1/ChartView'
import { useChartViewData } from '@/views/ChartView/v1/ChartViewData'

import { AppProvider, useAppContext } from './context'

const b = bem.bind(null, 'Chart-app')

export default function Chart() {
  const params = useProtoParams()

  return (
    <AppProvider>
      <ChartInner params={params} />
    </AppProvider>
  )
}

function ChartInner({ params }: { params: Record<string, unknown> }) {
  const chartData = useChartViewData(useAppContext)

  return (
    <div className={b()}>
      <h1 className={b('title')}>Chart App</h1>
      <pre className={b('params')}>{JSON.stringify(params, null, 2)}</pre>
      <ChartView data={chartData} />
    </div>
  )
}
