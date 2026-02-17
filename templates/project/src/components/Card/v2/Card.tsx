import React from 'react'

import './Card.scss'

interface CardProps {
  children?: React.ReactNode
  title?: string
}

export function Card({ children, title }: CardProps) {
  return (
    <div className="card card--v2">
      {title && <h3 className="card__title">{title}</h3>}
      {children}
    </div>
  )
}
