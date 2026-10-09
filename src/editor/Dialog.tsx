import { useId, type ReactNode } from 'react'

export function Dialog({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId()
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
