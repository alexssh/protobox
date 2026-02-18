import React from 'react'
import { useProtoParams } from 'protobox/useProtoParams'
import { bem } from 'protobox/bem'

import './Demo.scss'

import { DemoView } from '@/views/DemoView/v1/DemoView'
import { useDemoViewData } from '@/views/DemoView/v1/DemoViewData'

import { AppProvider, useAppContext } from './context'

const b = bem.bind(null, 'Demo-app')

export default function Demo() {
  const params = useProtoParams()

  return (
    <AppProvider>
      <DemoInner params={params} />
    </AppProvider>
  )
}

function DemoInner({ params }: { params: Record<string, unknown> }) {
  const demoData = useDemoViewData(useAppContext)

  return (
    <div className={b()}>
      <h1 className={b('title')}>Demo App</h1>
      <pre className={b('params')}>{JSON.stringify(params, null, 2)}</pre>
      <DemoView data={demoData} />
    </div>
  )
}
