import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

/** The logo and the name: wherever it shows up, it goes straight to the home page. */
export function BrandLink({ className, size }: { className: string; size: number }) {
  const { t } = useI18n()
  return (
    <Link to="/" className={className} title={t.app.goHome}>
      <img src="/favicon.svg" alt="" width={size} height={size} />
      {t.app.name}
    </Link>
  )
}
