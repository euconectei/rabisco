import { useState } from 'react'
import { detectLanguage } from './languages'
import { MESSAGES } from './messages'
import { readStoredLanguage } from './storage'
import { useI18n } from './useI18n'

/**
 * pt-BR pages no longer switch to the browser language on their own (see `isPtBrPagePath`), so
 * offer English to visitors whose browser asks for it and who never picked a language.
 */
export function LanguageSuggestion() {
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(
    () => lang === 'pt-BR' && readStoredLanguage() === null && detectLanguage(navigator.language) === 'en',
  )
  if (!open || lang !== 'pt-BR') return null

  // Written in English: it is only shown to browsers that ask for English.
  const t = MESSAGES.en.language
  return (
    <div className="language-suggestion" role="region" aria-label={t.label} lang="en">
      <p>{t.suggestion}</p>
      <button className="button" type="button" onClick={() => setLang('en')}>
        {t.suggestionAccept}
      </button>
      <button
        className="button-secondary"
        type="button"
        onClick={() => {
          setLang('pt-BR')
          setOpen(false)
        }}
      >
        {t.suggestionDismiss}
      </button>
    </div>
  )
}
