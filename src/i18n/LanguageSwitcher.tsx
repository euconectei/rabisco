import { LANGUAGES, isLanguage } from './languages'
import { useI18n } from './useI18n'

export function LanguageSwitcher() {
  const { lang, t, setLang } = useI18n()
  return (
    <label className="language-switcher">
      {t.language.label}
      <select
        value={lang}
        onChange={(event) => {
          if (isLanguage(event.target.value)) setLang(event.target.value)
        }}
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {t.language[code]}
          </option>
        ))}
      </select>
    </label>
  )
}
