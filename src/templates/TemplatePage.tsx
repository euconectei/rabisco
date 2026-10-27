import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'
import { BrandLink } from '../components/BrandLink'
import type { Language } from '../i18n/languages'
import { MESSAGES } from '../i18n/messages'
import { NotFoundPage } from '../pages/NotFoundPage'
import { templateById, templateBySlug, templatePath, templatesIndexPath } from './registry'
import { TemplateLanguageLinks } from './TemplateLanguageLinks'
import { TemplateOutline } from './TemplateOutline'
import { useRouteLanguage } from './useRouteLanguage'
import type { Template } from './types'
import './templates.css'

export function templateImagePath(template: Template, lang: Language): string {
  return `/templates/${template.id}.${lang}.webp`
}

export function templateStartPath(template: Template): string {
  return `/edit/new?template=${encodeURIComponent(template.id)}`
}

export function TemplatePage({ lang, slug: slugProp }: { lang: Language; slug?: string }) {
  const params = useParams()
  const slug = slugProp ?? params.slug ?? ''
  const navigate = useNavigate()
  useRouteLanguage(lang)
  const template = templateBySlug(lang, slug)
  const locale = template?.locales[lang]
  if (!template || !locale) return <NotFoundPage />
  const t = MESSAGES[lang].templates
  const related = template.related.map(templateById).filter((item): item is Template => item?.locales[lang] !== undefined)

  return (
    <main className="page docs template-page" lang={lang}>
      <nav className="template-breadcrumb" aria-label="Breadcrumb">
        <BrandLink className="template-brand" size={20} />
        <span aria-hidden="true">›</span>
        <Link to={templatesIndexPath(lang)}>{t.breadcrumb}</Link>
      </nav>
      <header className="template-header">
        <p className="template-tags">
          {t[template.diagram]} · {t[template.kind]} · {t[template.category]}
        </p>
        <h1>{locale.title}</h1>
      </header>
      <figure className="template-figure">
        <img src={templateImagePath(template, lang)} alt={locale.imageAlt} width={1200} height={750} loading="eager" />
      </figure>
      <div className="template-start">
        <button type="button" className="button button-large" onClick={() => navigate(templateStartPath(template))}>
          {t.useTemplate}
        </button>
        <p className="template-start-hint">{t.useHint}</p>
      </div>
      <p className="template-intro">{locale.intro}</p>
      {locale.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.items && (
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <TemplateOutline template={template} locale={locale} lang={lang} />
      <div className="template-start">
        <button type="button" className="button" onClick={() => navigate(templateStartPath(template))}>
          {t.useTemplate}
        </button>
      </div>
      {related.length > 0 && (
        <section>
          <h2>{t.related}</h2>
          <ul className="template-related">
            {related.map((item) => (
              <li key={item.id}>
                <Link to={templatePath(lang, item)!}>{item.locales[lang]!.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p>
        <Link to={templatesIndexPath(lang)}>{t.allTemplates}</Link>
      </p>
      <TemplateLanguageLinks lang={lang} template={template} />
      <AppFooter />
    </main>
  )
}

export default TemplatePage
