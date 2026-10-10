import { useState } from 'react'
import { useI18n } from '../i18n/useI18n'

// Render with key={name} so the field resets when the file is renamed or reloaded.
export function TitleField({ name, onRename }: { name: string; onRename(name: string): Promise<boolean> }) {
  const { t } = useI18n()
  const [value, setValue] = useState(name)
  return (
    <input
      className="title-field"
      aria-label={t.editor.titleLabel}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setValue(name)
          event.currentTarget.blur()
        }
      }}
      onBlur={async () => {
        if (!(await onRename(value))) setValue(name)
      }}
    />
  )
}
