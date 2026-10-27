import type { Language } from '../i18n/languages'
import { MESSAGES } from '../i18n/messages'
import { parseMarkdownOutline, type OutlineNode } from '../mindmap/outline'
import { flowchartSteps } from './flowchartSteps'
import type { Template, TemplateLocale } from './types'

function Branches({ nodes }: { nodes: OutlineNode[] }) {
  return (
    <ul>
      {nodes.map((node, index) => (
        <li key={`${index}-${node.text}`}>
          {node.text}
          {node.children.length > 0 && <Branches nodes={node.children} />}
        </li>
      ))}
    </ul>
  )
}

/** The diagram's content as text: the map as a nested list, or the flowchart as its steps. */
export function TemplateOutline({ template, locale, lang }: { template: Template; locale: TemplateLocale; lang: Language }) {
  const t = MESSAGES[lang].templates
  if (template.diagram === 'flowchart') {
    return (
      <section className="template-outline">
        <h2>{t.stepsTitle}</h2>
        <ol>
          {flowchartSteps(locale.source).map((step, index) => (
            <li key={`${index}-${step.label}`}>
              {step.label}
              {step.next.length > 0 && (
                <span className="template-outline-next">
                  {' → '}
                  {step.next.map((next) => (next.via ? `${next.via}: ${next.label}` : next.label)).join(' · ')}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>
    )
  }
  const root = parseMarkdownOutline(locale.source, locale.title)
  if (!root) return null
  return (
    <section className="template-outline">
      <h2>{t.outlineTitle}</h2>
      <Branches nodes={[root]} />
    </section>
  )
}
