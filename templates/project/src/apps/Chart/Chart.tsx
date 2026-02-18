import React from 'react'
import { useProtoParams } from 'protobox/useProtoParams'

import './Chart.scss'

import { ChartView } from '@/views/ChartView/v1/ChartView'

import { AppProvider, useAppContext } from './context'

export default function Chart() {
  const params = useProtoParams()

  return (
    <AppProvider>
      <div className="chart-app">
        <h1 className="chart-app__title">Chart App</h1>
        <pre className="chart-app__params">{JSON.stringify(params, null, 2)}</pre>
        <ChartView useAppContext={useAppContext} />
      </div>
    </AppProvider>
  )
}
