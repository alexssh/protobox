import React from 'react'
import { useProtoParams } from 'protobox/useProtoParams'

import './Demo.scss'

import { DemoView } from '@/views/DemoView/v1/DemoView'

import { AppProvider, useAppContext } from './context'

export default function Demo() {
  const params = useProtoParams()

  return (
    <AppProvider>
      <div className="demo-app">
        <h1 className="demo-app__title">Demo App</h1>
        <pre className="demo-app__params">{JSON.stringify(params, null, 2)}</pre>
        <DemoView useAppContext={useAppContext} />
      </div>
    </AppProvider>
  )
}
