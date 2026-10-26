import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import { useI18n } from '../i18n/useI18n'

export default function ImportDocsPage() {
  const { lang, t } = useI18n()
  const navigate = useNavigate()
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')
  const d = t.importDocs
  const staticDoc = lang === 'pt-BR' ? '/docs/import.pt-BR.md' : '/docs/import.md'

  // React Router keeps the history index in history.state; 0 means the page was opened directly.
  const canGoBack = typeof window !== 'undefined' && ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(d.prompt)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <main className="page docs">
      <header className="page-header">
        <h1>{d.title}</h1>
        <button className="button-secondary" type="button" onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}>
          {d.back}
        </button>
      </header>
      <p>{d.intro}</p>

      <h2>{d.stepsTitle}</h2>
      <ol>
        <li>{d.step1}</li>
        <li>{d.step2}</li>
        <li>{d.step3}</li>
        <li>{d.step4}</li>
      </ol>

      <h2>{d.promptTitle}</h2>
      <pre className="docs-code">
        <code>{d.prompt}</code>
      </pre>
      <button className="button" type="button" onClick={() => void copyPrompt()}>
        {d.copy}
      </button>
      <p role="status" className="docs-copy-status">
        {copy === 'copied' && d.copied}
        {copy === 'failed' && d.copyFailed}
      </p>

      <h2>{d.formatTitle}</h2>
      <ul>
        <li>{d.rule1}</li>
        <li>{d.rule2}</li>
        <li>{d.rule3}</li>
        <li>{d.rule4}</li>
      </ul>

      <h2>{d.exampleTitle}</h2>
      <p>{d.exampleIntro}</p>
      <pre className="docs-code">
        <code>{d.example}</code>
      </pre>
      <p>{d.exampleResult}</p>

      <h2>{d.machineTitle}</h2>
      <p>
        {d.machineText} <a href={staticDoc}>{staticDoc}</a>, <a href="/llms.txt">/llms.txt</a>
      </p>

      <LanguageSwitcher />
      <AppFooter />
    </main>
  )
}
