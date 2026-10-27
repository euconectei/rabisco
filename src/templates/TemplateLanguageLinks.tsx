import { Link } from 'react-router-dom'
import { LANGUAGES, type Language } from '../i18n/languages'
import { MESSAGES } from '../i18n/messages'
import { templatePath, templatesIndexPath } from './registry'
import type { Template } from './types'

/**
 * PT | EN as links: each leads to the same template in the other language, or to that language's
 * template list when the topic only exists in one of them.
 */
export function TemplateLanguageLinks({ lang, template }: { lang: Language; template?: Template }) {
  return (
    <nav className="language-switcher" aria-label={MESSAGES[lang].language.label}>
      {LANGUAGES.map((code) => (
        <Link
          key={code}
          to={(template && templatePath(code, template)) ?? templatesIndexPath(code)}
          lang={code}
          hrefLang={code}
          aria-label={MESSAGES[lang].language[code]}
          aria-current={code === lang ? 'page' : undefined}
        >
          {code.slice(0, 2).toUpperCase()}
        </Link>
      ))}
    </nav>
  )
}
