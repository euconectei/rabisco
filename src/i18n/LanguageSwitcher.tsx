import { LANGUAGES } from './languages'
import { useI18n } from './useI18n'

/** PT | EN toggle: one tap switches; each option is announced by its full name, in its own language. */
export function LanguageSwitcher() {
  const { lang, t, setLang } = useI18n()
  return (
    <div className="language-switcher" role="group" aria-label={t.language.label}>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={t.language[code]}
          aria-pressed={code === lang}
          onClick={() => setLang(code)}
        >
          {code.slice(0, 2).toUpperCase()}
        </button>
      ))}
    </div>
  )
}
