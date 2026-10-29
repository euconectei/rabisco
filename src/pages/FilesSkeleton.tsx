import { useI18n } from '../i18n/useI18n'

const PLACEHOLDERS = 6

/** The files grid before the cards arrive: same sizes, so nothing moves when they do. */
export function FilesSkeleton() {
  const { t } = useI18n()
  return (
    <div role="status">
      <span className="visually-hidden">{t.files.loading}</span>
      <ul className="files-grid" aria-hidden="true">
        {Array.from({ length: PLACEHOLDERS }, (_, index) => (
          <li key={index} className="file-card-skeleton">
            <span className="file-preview" />
            <span className="file-meta">
              <span className="skeleton-line" />
              <span className="skeleton-line" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
