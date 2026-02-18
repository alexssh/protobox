import React from 'react'
import { bem } from 'protobox/bem'

import './Card.scss'

const b = bem.bind(null, 'Card')

interface CardProps {
  children?: React.ReactNode
  title?: string
}

export function Card({ children, title }: CardProps) {
  return (
    <div className={b(undefined, { version: 'v1' })}>
      {title && <h3 className={b('title')}>{title}</h3>}
      {children}
    </div>
  )
}
