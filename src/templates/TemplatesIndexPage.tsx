import { Link } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'
import { BrandLink } from '../components/BrandLink'
import type { Language } from '../i18n/languages'
import { MESSAGES } from '../i18n/messages'
import { templatePath, templatesIn } from './registry'
import { templateImagePath } from './TemplatePage'
import { TemplateLanguageLinks } from './TemplateLanguageLinks'
import { useRouteLanguage } from './useRouteLanguage'
import type { TemplateCategory } from './types'
import './templates.css'

const CATEGORIES: TemplateCategory[] = ['study', 'work']

export function TemplatesIndexPage({ lang }: { lang: Language }) {
  useRouteLanguage(lang)
  const t = MESSAGES[lang].templates
  const templates = templatesIn(lang)
  return (
    <main className="page docs template-index" lang={lang}>
      <nav className="template-breadcrumb" aria-label="Breadcrumb">
        <BrandLink className="template-brand" size={20} />
      </nav>
      <h1>{t.indexTitle}</h1>
      <p>{t.indexIntro}</p>
      {CATEGORIES.map((category) => {
        const inCategory = templates.filter((template) => template.category === category)
        if (inCategory.length === 0) return null
        return (
          <section key={category} aria-labelledby={`templates-${category}`}>
            <h2 id={`templates-${category}`}>{t[category]}</h2>
            <ul className="template-cards">
              {inCategory.map((template) => {
                const locale = template.locales[lang]!
                return (
                  <li key={template.id} className="template-card">
                    <Link to={templatePath(lang, template)!}>
                      <img src={templateImagePath(template, lang)} alt="" width={1200} height={750} loading="lazy" />
                      <span className="template-card-title">{locale.title}</span>
                      <span className="template-card-kind">
                        {t[template.diagram]} · {t[template.kind]}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      <TemplateLanguageLinks lang={lang} />
      <AppFooter />
    </main>
  )
}

export default TemplatesIndexPage
